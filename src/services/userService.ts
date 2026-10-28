import { Profile, UserRole } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { AuditService } from "./audit";

const USERS_STORAGE_KEY = "alezz_system_users";

// Default admin and system users
export const defaultUsers: Profile[] = [
  {
    id: "u0000000-0000-0000-0000-000000000001",
    username: "admin",
    email: "admin@alezz.sa",
    password: "100200300aa",
    full_name: "م / أحمد العز (المدير العام)",
    role: "admin",
    phone: "0506025022",
    created_at: "2026-01-01T08:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "u0000000-0000-0000-0000-000000000002",
    username: "accountant",
    email: "accountant@alezz.sa",
    password: "100200300aa",
    full_name: "أ / فهد الشهري (المحاسب المالي)",
    role: "accountant",
    phone: "0551234567",
    created_at: "2026-01-15T09:30:00.000Z",
    updated_at: new Date().toISOString(),
  },
];

export class UserService {
  /**
   * Fetch all system users/profiles (checks Supabase, merges/falls back to localStorage)
   */
  static async getUsers(): Promise<Profile[]> {
    let localUsers: Profile[] = [];
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        localUsers = JSON.parse(saved);
      }
    } catch {
      // ignore
    }

    if (!localUsers || localUsers.length === 0) {
      localUsers = [...defaultUsers];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
    } else {
      // Ensure default admin exists
      const hasAdmin = localUsers.some(
        (u) => u.username === "admin" || u.email === "admin@alezz.sa"
      );
      if (!hasAdmin) {
        localUsers.unshift(defaultUsers[0]);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
      } else {
        // Guarantee admin has password set
        const adminIndex = localUsers.findIndex(
          (u) => u.username === "admin" || u.email === "admin@alezz.sa"
        );
        if (adminIndex !== -1 && !localUsers[adminIndex].password) {
          localUsers[adminIndex].password = "100200300aa";
          localUsers[adminIndex].username = "admin";
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
        }
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          // Merge database profiles with local credentials
          const merged = data.map((dbUser) => {
            const localMatch = localUsers.find(
              (l) => l.id === dbUser.id || l.email === dbUser.email || (l.username && l.username === dbUser.email.split("@")[0])
            );
            return {
              ...dbUser,
              username: localMatch?.username || dbUser.email.split("@")[0],
              password: localMatch?.password || "100200300aa",
            };
          });

          // Add any local users not yet in db
          for (const l of localUsers) {
            if (!merged.some((m) => m.id === l.id || m.email === l.email)) {
              merged.push(l);
            }
          }

          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      } catch (err) {
        console.warn("Supabase fetch users failed:", err);
      }
    }

    return localUsers;
  }

  /**
   * Find user by identifier (username or email)
   */
  static async findUserByIdentifier(identifier: string): Promise<Profile | null> {
    const users = await this.getUsers();
    const clean = identifier.trim().toLowerCase();
    return (
      users.find(
        (u) =>
          u.username?.toLowerCase() === clean ||
          u.email.toLowerCase() === clean ||
          u.email.toLowerCase().split("@")[0] === clean
      ) || null
    );
  }

  /**
   * Create a new user (supports username without email)
   */
  static async createUser(
    userData: {
      username?: string;
      email?: string;
      full_name: string;
      role: UserRole;
      phone?: string;
      password?: string;
    },
  ): Promise<Profile> {
    // Generate valid email if user entered only username
    const username = (userData.username || userData.email?.split("@")[0] || "user").trim();
    const email = userData.email?.trim() || `${username}@alezz.sa`;
    const password = userData.password || "100200300aa";

    const newUser: Profile = {
      id: crypto.randomUUID(),
      username,
      email,
      password,
      full_name: userData.full_name,
      role: userData.role,
      phone: userData.phone || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Immediate local persistence
    const current = await this.getUsers();
    const updated = [...current.filter((u) => u.id !== newUser.id && u.username !== newUser.username && u.email !== newUser.email), newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));

    // Sync to Supabase if available
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .upsert({
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            phone: newUser.phone,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at,
          })
          .select()
          .single();

        if (!error && data) {
          const synced = updated.map((u) => (u.id === newUser.id ? { ...u, ...data } : u));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(synced));
        }
      } catch (err) {
        console.warn("Supabase create user error (saved locally):", err);
      }
    }

    await AuditService.log({
      action: "CREATE_USER",
      entity_type: "user",
      entity_id: newUser.id,
      new_data: newUser,
      metadata: { username: newUser.username, email: newUser.email, role: newUser.role },
    });

    return newUser;
  }

  /**
   * Update user details, username, password, or role
   */
  static async updateUser(
    userId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const currentUsers = await this.getUsers();
    const existing = currentUsers.find((u) => u.id === userId);

    if (updates.username && !updates.email) {
      updates.email = `${updates.username.trim()}@alezz.sa`;
    }

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
        const dbUpdates: Record<string, any> = {
          updated_at: updatedUser.updated_at,
        };
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.full_name) dbUpdates.full_name = updates.full_name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;

        const { data, error } = await supabase
          .from("profiles")
          .update(dbUpdates)
          .eq("id", userId)
          .select()
          .single();

        if (!error && data) {
          const synced = currentUsers.map((u) => (u.id === userId ? { ...updatedUser, ...data } : u));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(synced));
        }
      } catch (err) {
        console.warn("Supabase update user error (persisted locally):", err);
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
   * Delete user
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const currentUsers = await this.getUsers();
    const existing = currentUsers.find((u) => u.id === userId);

    const filtered = currentUsers.filter((u) => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured) {
      try {
        await supabase.from("profiles").delete().eq("id", userId);
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
