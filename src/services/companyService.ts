import { Company, CompanySettings } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore } from "./storage/localStore";
import { AuditService } from "./audit";

export class CompanyService {
  static async getCompany(): Promise<Company> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .limit(1)
          .single();
        if (!error && data) {
          if (!data.iban || data.iban === "SA4480000000608010167890" || data.iban.includes("0000000000")) {
            data.iban = "SA2880000695608016045924";
          }
          if (!data.bank_account_number || data.bank_account_number.includes("0000000000")) {
            data.bank_account_number = "695000010006086045924";
          }
          if (!data.bank_name_ar) {
            data.bank_name_ar = "مصرف الراجحي";
          }
          LocalStore.saveCompany(data);
          return data;
        }
      } catch (err) {
        console.warn("Supabase fetch company failed:", err);
      }
    }
    return LocalStore.getCompany();
  }

  static async updateCompany(updates: Partial<Company>): Promise<Company> {
    const existing = await this.getCompany();
    const updated: Company = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Immediate local persistence guarantee
    LocalStore.saveCompany(updated);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("companies")
          .update({ ...updates, updated_at: updated.updated_at })
          .eq("id", existing.id)
          .select()
          .single();

        if (!error && data) {
          LocalStore.saveCompany(data);
          await AuditService.log({
            action: "UPDATE_COMPANY_SETTINGS",
            entity_type: "company",
            entity_id: existing.id,
            old_data: existing,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase update company failed, preserved locally:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_COMPANY_SETTINGS",
      entity_type: "company",
      entity_id: existing.id,
      old_data: existing,
      new_data: updated,
    });

    return updated;
  }

  static async getSettings(): Promise<CompanySettings> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .limit(1)
          .single();
        if (!error && data) {
          LocalStore.saveSettings(data);
          return data;
        }
      } catch (err) {
        console.warn("Supabase fetch settings failed:", err);
      }
    }
    return LocalStore.getSettings();
  }

  static async updateSettings(
    updates: Partial<CompanySettings>,
  ): Promise<CompanySettings> {
    const existing = await this.getSettings();
    const updated: CompanySettings = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Immediate local persistence guarantee
    LocalStore.saveSettings(updated);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("company_settings")
          .update({ ...updates, updated_at: updated.updated_at })
          .eq("id", existing.id)
          .select()
          .single();

        if (!error && data) {
          LocalStore.saveSettings(data);
          await AuditService.log({
            action: "UPDATE_SYSTEM_SETTINGS",
            entity_type: "settings",
            entity_id: existing.id,
            old_data: existing,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase update settings failed, preserved locally:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_SYSTEM_SETTINGS",
      entity_type: "settings",
      entity_id: existing.id,
      old_data: existing,
      new_data: updated,
    });

    return updated;
  }
}
