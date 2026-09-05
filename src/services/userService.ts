import { Profile, UserRole } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { AuditService } from "./audit";

const USERS_STORAGE_KEY = "alezz_system_users";

export const defaultUsers: Profile[] = [
  {
    id: "u0000000-0000-0000-0000-000000000001",
    email: "admin@alezz.sa",
    full_name: "م / أحمد العز (المدير العام)",
    role: "admin",
    phone: "0506025022",
    created_at: "2026-01-01T08:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "u0000000-0000-0000-0000-000000000002",
    email: "accountant@alezz.sa",
    full_name: "أ / فهد الشهري (المحاسب المالي)",
    role: "accountant",
    phone: "0551234567",
    created_at: "2026-01-15T09:30:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "u0000000-0000-0000-0000-000000000003",
    email: "viewer@alezz.sa",
    full_name: "م / سارة العتيبي (مستعرض تدقيق)",
    role: "viewer",
    phone: "0509876543",
    created_at: "2026-02-01T10:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
];

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

        if (!error && data && data.length > 0) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn("Supabase fetch users failed:", err);
      }
    }

    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
  }

  /**
   * Create a new user profile
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
    const newUser: Profile = {
      id: crypto.randomUUID(),
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      phone: userData.phone || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Immediate local persistence guarantee
    const current = await this.getUsers();
    const updated = [...current.filter((u) => u.id !== newUser.id), newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .insert(newUser)
          .select()
          .single();

        if (!error && data) {
          const synced = [...current.filter((u) => u.id !== data.id), data];
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(synced));
          await AuditService.log({
            action: "CREATE_USER",
            entity_type: "user",
            entity_id: data.id,
            new_data: data,
            metadata: { email: data.email, role: data.role },
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase create user error:", err);
      }
    }

    await AuditService.log({
      action: "CREATE_USER",
      entity_type: "user",
      entity_id: newUser.id,
      new_data: newUser,
      metadata: { email: newUser.email, role: newUser.role },
    });

    return newUser;
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
