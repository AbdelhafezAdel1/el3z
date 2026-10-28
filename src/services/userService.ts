import { Profile, UserRole } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { AuditService } from "./audit";

const USERS_STORAGE_KEY = "alezz_system_users";

export class UserService {
  /**
   * Fetch all system users/profiles
   */
  static async getUsers(): Promise<Profile[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data) {
          // Cache the real data
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn("Supabase fetch users failed:", err);
        // On error, try to return cached data
        try {
          const saved = localStorage.getItem(USERS_STORAGE_KEY);
          if (saved) return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
      // Supabase configured but returned error with no cache → return empty
      return [];
    }

    // Supabase not configured: return empty array (no fake users)
    return [];
  }

  /**
   * Create a new user — registers in Supabase Auth AND inserts/upserts the profile row.
   * Without the Auth step the user has no credentials and cannot sign in.
   */
  static async createUser(
    userData: {
      email: string;
      full_name: string;
      role: UserRole;
      phone?: string;
      password?: string;
    },
  ): Promise<Profile> {
    if (isSupabaseConfigured) {
      if (!userData.password) {
        throw new Error("كلمة المرور مطلوبة لإنشاء حساب المستخدم");
      }

      // Step 1: Create the auth account so the user can actually sign in.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        throw new Error("تعذر الحصول على معرف المستخدم من Supabase Auth");
      }

      // Step 2: Upsert the profile row with the real auth UUID.
      const newProfile: Profile = {
        id: authUserId,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .upsert(newProfile)
        .select()
        .single();

      const savedProfile = !profileError && profileData ? profileData : newProfile;

      // Sync local cache
      const current = await this.getUsers();
      const synced = [...current.filter((u) => u.id !== savedProfile.id), savedProfile];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(synced));

      await AuditService.log({
        action: "CREATE_USER",
        entity_type: "user",
        entity_id: savedProfile.id,
        new_data: savedProfile,
        metadata: { email: savedProfile.email, role: savedProfile.role },
      });

      return savedProfile;
    }

    // Supabase not configured — no real auth possible.
    throw new Error("خدمة المصادقة غير متاحة. يرجى ضبط إعدادات Supabase.");
  }

  /**
   * Update user details or role
   */
  static async updateUser(
    userId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const currentUsers = await this.getUsers();
    const existing = currentUsers.find((u) => u.id === userId);

    const updatedUser: Profile = {
      ...(existing || ({} as Profile)),
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const updatedList = currentUsers.map((u) =>
      u.id === userId ? updatedUser : u,
    );
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", userId)
          .select()
          .single();

        if (!error && data) {
          const synced = currentUsers.map((u) => (u.id === userId ? data : u));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(synced));
          await AuditService.log({
            action: "UPDATE_USER",
            entity_type: "user",
            entity_id: userId,
            old_data: existing,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase update user error:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_USER",
      entity_type: "user",
      entity_id: userId,
      old_data: existing,
      new_data: updatedUser,
    });

    return updatedUser;
  }

  /**
   * Delete or deactivate user
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const currentUsers = await this.getUsers();
    const existing = currentUsers.find((u) => u.id === userId);

    const filtered = currentUsers.filter((u) => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (!error) {
          await AuditService.log({
            action: "DELETE_USER",
            entity_type: "user",
            entity_id: userId,
            old_data: existing,
          });
          return true;
        }
      } catch (err) {
        console.warn("Supabase delete user error:", err);
      }
    }

    await AuditService.log({
      action: "DELETE_USER",
      entity_type: "user",
      entity_id: userId,
      old_data: existing,
    });

    return true;
  }
}
