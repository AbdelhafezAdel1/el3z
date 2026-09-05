import { AuditLog, Profile } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore, defaultCompany } from "./storage/localStore";

export class AuditService {
  /**
   * Helper to retrieve currently logged-in user details
   */
  private static getCurrentUser(): Partial<Profile> {
    try {
      const saved = localStorage.getItem("alezz_auth_user");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      id: "u0000000-0000-0000-0000-000000000001",
      full_name: "م / أحمد العز (المدير العام)",
      email: "admin@alezz.sa",
      role: "admin",
    };
  }

  /**
   * Records an immutable audit log entry in Supabase & LocalStore
   */
  static async log(entry: {
    action: string;
    entity_type: string;
    entity_id?: string;
    old_data?: unknown;
    new_data?: unknown;
    metadata?: Record<string, unknown>;
    user_id?: string;
    user_name?: string;
    user_email?: string;
    user_role?: unknown;
  }): Promise<void> {
    const currentUser = this.getCurrentUser();

    const logItem: AuditLog = {
      id: crypto.randomUUID(),
      user_id: entry.user_id || currentUser.id || "u0000000-0000-0000-0000-000000000001",
      user_name: entry.user_name || currentUser.full_name || "مدير النظام (Admin)",
      user_email: entry.user_email || currentUser.email || "admin@alezz.sa",
      user_role: (entry.user_role as any) || currentUser.role || "admin",
      company_id: defaultCompany.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      old_data: entry.old_data as any,
      new_data: entry.new_data as any,
      metadata: entry.metadata as any,
      ip_address: "127.0.0.1",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : "Client Application",
      created_at: new Date().toISOString(),
    };

    // Immediate local persistence guarantee
    const currentLogs = LocalStore.getAuditLogs();
    LocalStore.saveAuditLogs([logItem, ...currentLogs.slice(0, 499)]); // Keep last 500 logs locally

    if (isSupabaseConfigured) {
      try {
        await supabase.from("audit_logs").insert(logItem);
      } catch (err) {
        console.warn("Supabase audit log insert failed, saved locally:", err);
      }
    }
  }

  /**
   * Fetches audit logs with optional filtering
   */
  static async getLogs(filter?: {
    action?: string;
    entity_type?: string;
    user_id?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false });

        if (filter?.action) query = query.eq("action", filter.action);
        if (filter?.entity_type) query = query.eq("entity_type", filter.entity_type);
        if (filter?.user_id) query = query.eq("user_id", filter.user_id);
        if (filter?.startDate) query = query.gte("created_at", filter.startDate);
        if (filter?.endDate) query = query.lte("created_at", filter.endDate);
        if (filter?.limit) query = query.limit(filter.limit);
        else query = query.limit(200);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          LocalStore.saveAuditLogs(data);
          return data;
        }
      } catch (err) {
        console.warn("Supabase fetch audit logs failed, fallback to local store:", err);
      }
    }

    let logs = LocalStore.getAuditLogs();
    if (filter?.action) logs = logs.filter((l) => l.action === filter.action);
    if (filter?.entity_type) logs = logs.filter((l) => l.entity_type === filter.entity_type);
    if (filter?.user_id) logs = logs.filter((l) => l.user_id === filter.user_id);
    if (filter?.startDate) logs = logs.filter((l) => l.created_at >= filter.startDate!);
    if (filter?.endDate) logs = logs.filter((l) => l.created_at <= filter.endDate!);
    if (filter?.limit) logs = logs.slice(0, filter.limit);

    return logs;
  }
}
