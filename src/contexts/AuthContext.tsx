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
import { UserService } from "../services/userService";

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  signIn: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    const saved = localStorage.getItem("alezz_auth_user");
    if (saved) {
      try {
        return JSON.parse(saved) as Profile;
      } catch {
        localStorage.removeItem("alezz_auth_user");
      }
    }
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
        setUser((prev) => {
          const merged = { ...prev, ...data };
          localStorage.setItem("alezz_auth_user", JSON.stringify(merged));
          return merged;
        });
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

      // Check if we have an active Supabase session
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            await fetchUserProfile(session.user.id, session.user.email || "");
          }
        } catch (err) {
          console.warn("Error checking auth session:", err);
        }
      }

      // Check local storage authenticated session if user is not set yet
      if (mounted) {
        const saved = localStorage.getItem("alezz_auth_user");
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch {
            localStorage.removeItem("alezz_auth_user");
          }
        }
        setIsLoading(false);
      }
    }

    void initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email || "");
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }
  }, [fetchUserProfile]);

  const setRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem("alezz_auth_user", JSON.stringify(updated));
    }
  };

  /**
   * Universal sign-in: accepts username or email and password
   */
  const signIn = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      const trimmedPass = pass.trim();

      // Step 1: Look up user in local/synced user registry
      const matchedUser = await UserService.findUserByIdentifier(trimmedIdentifier);

      if (matchedUser) {
        // Verify password
        const expectedPass = matchedUser.password || "100200300aa";
        if (trimmedPass === expectedPass) {
          setUser(matchedUser);
          localStorage.setItem("alezz_auth_user", JSON.stringify(matchedUser));

          // Try signing in with Supabase in background if email is confirmed
          if (isSupabaseConfigured && matchedUser.email) {
            try {
              await supabase.auth.signInWithPassword({
                email: matchedUser.email,
                password: trimmedPass,
              });
            } catch {
              // Ignore background auth sync error
            }
          }

          return { success: true };
        } else {
          return { success: false, error: "كلمة المرور غير صحيحة" };
        }
      }

      // Step 2: If not in local list, attempt direct Supabase auth (if email format)
      if (isSupabaseConfigured && trimmedIdentifier.includes("@")) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedIdentifier,
          password: trimmedPass,
        });
        if (!error && data.user) {
          await fetchUserProfile(data.user.id, data.user.email || trimmedIdentifier);
          return { success: true };
        }
      }

      return { success: false, error: "اسم المستخدم أو البريد الإلكتروني غير مسجل، أو كلمة المرور غير صحيحة" };
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
    if (!user) return { success: false, error: "المستخدم غير مسجل" };
    try {
      await UserService.updateUser(user.id, { password: newPassword });

      if (isSupabaseConfigured) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {
          // ignore
        }
      }

      const updated = { ...user, password: newPassword };
      setUser(updated);
      localStorage.setItem("alezz_auth_user", JSON.stringify(updated));
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
      await UserService.updateUser(user.id, { email: newEmail });

      if (isSupabaseConfigured) {
        try {
          await supabase.auth.updateUser({ email: newEmail });
        } catch {
          // ignore
        }
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
      await UserService.updateUser(user.id, updates);

      const updatedUser: Profile = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString(),
      };

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
