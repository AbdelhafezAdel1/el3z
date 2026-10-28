import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { Profile, UserRole } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

// NOTE: defaultAdminUser removed — no auto-login bypass allowed.

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    // Only restore from localStorage if Supabase is NOT configured (offline mode).
    // When Supabase IS configured we wait for the real session check in useEffect.
    const saved = localStorage.getItem("alezz_auth_user");
    if (saved) {
      try {
        return JSON.parse(saved) as Profile;
      } catch {
        localStorage.removeItem("alezz_auth_user");
      }
    }
    // No stored session → require login
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch or sync user profile from Supabase profiles table
  const fetchUserProfile = useCallback(async (userId: string, email: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setUser(data);
        localStorage.setItem("alezz_auth_user", JSON.stringify(data));
      } else {
        // Create profile if missing
        const newProf: Profile = {
          id: userId,
          email,
          full_name: email.split("@")[0] || "المستخدم",
          role: email.includes("admin") ? "admin" : "accountant",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabase.from("profiles").upsert(newProf);
        setUser(newProf);
        localStorage.setItem("alezz_auth_user", JSON.stringify(newProf));
      }
    } catch (err) {
      console.warn("Could not fetch profile from Supabase:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            await fetchUserProfile(session.user.id, session.user.email || "");
          } else if (!session && mounted) {
            // No valid Supabase session → clear any stale localStorage and force login
            setUser(null);
            localStorage.removeItem("alezz_auth_user");
          }
        } catch (err) {
          console.warn("Error checking auth session:", err);
          // On error, be safe: clear state and force login
          if (mounted) {
            setUser(null);
            localStorage.removeItem("alezz_auth_user");
          }
        }
      }
      if (mounted) setIsLoading(false);
    }

    void initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email || "");
          } else {
            // Logged out
            setUser(null);
            localStorage.removeItem("alezz_auth_user");
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  const setRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem("alezz_auth_user", JSON.stringify(updated));
    }
  };

  const signIn = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          await fetchUserProfile(data.user.id, data.user.email || email);
          return { success: true };
        }
      }

      // Supabase is not configured — reject login entirely for security.
      // Do NOT allow any user to authenticate without a real Supabase session.
      return { success: false, error: "خدمة المصادقة غير متاحة حالياً. يرجى التواصل مع المسؤول." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل تسجيل الدخول";
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("alezz_auth_user");
    }
  };

  const resetPasswordForEmail = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#reset-password`,
        });
        if (error) return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "فشل إرسال رابط الاستعادة",
      };
    }
  };

  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "فشل تحديث كلمة المرور",
      };
    }
  };

  const updateEmail = async (
    newEmail: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "المستخدم غير مسجل" };
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          email: newEmail,
        });
        if (error) return { success: false, error: error.message };
      }

      const updatedUser: Profile = {
        ...user,
        email: newEmail,
        updated_at: new Date().toISOString(),
      };
      setUser(updatedUser);
      localStorage.setItem("alezz_auth_user", JSON.stringify(updatedUser));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "فشل تغيير البريد الإلكتروني",
      };
    }
  };

  const updateProfile = async (
    updates: Partial<Profile>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "المستخدم غير مسجل" };
    try {
      const updatedUser: Profile = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);
        if (error) return { success: false, error: error.message };
      }

      setUser(updatedUser);
      localStorage.setItem("alezz_auth_user", JSON.stringify(updatedUser));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "فشل تحديث الملف الشخصي",
      };
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || "viewer",
        isAuthenticated: Boolean(user),
        isLoading,
        setRole,
        signIn,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        updateEmail,
        updateProfile,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
