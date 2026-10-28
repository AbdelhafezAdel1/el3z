import { Company, CompanySettings } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore } from "./storage/localStore";
import { AuditService } from "./audit";

const KNOWN_COMPANY_COLUMNS = [
  "id",
  "name_ar",
  "name_en",
  "vat_number",
  "cr_number",
  "building_no",
  "street_ar",
  "street_en",
  "district_ar",
  "district_en",
  "city_ar",
  "city_en",
  "postal_code",
  "country_code",
  "phone",
  "email",
  "website",
  "iban",
  "bank_name_ar",
  "bank_name_en",
  "logo_url",
  "created_at",
  "updated_at",
];

const KNOWN_SETTINGS_COLUMNS = [
  "id",
  "company_id",
  "default_vat_rate",
  "invoice_prefix",
  "include_qr_code",
  "invoice_background_url",
  "invoice_footer_notes_ar",
  "invoice_footer_notes_en",
  "zatca_environment",
  "zatca_production_csid",
  "zatca_compliance_csid",
  "zatca_api_secret",
  "created_at",
  "updated_at",
];

function sanitizePayload(
  obj: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export class CompanyService {
  static async getCompany(): Promise<Company> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .limit(1);

        if (!error && data && data.length > 0) {
          const comp = data[0] as Company;
          if (!comp.iban || comp.iban.includes("0000000000")) {
            comp.iban = "SA2880000695608016045924";
          }
          if (!comp.bank_account_number) {
            comp.bank_account_number = "695000010006086045924";
          }
          if (!comp.bank_name_ar) {
            comp.bank_name_ar = "مصرف الراجحي";
          }
          LocalStore.saveCompany(comp);
          return comp;
        }

        // If table is completely empty on server, attempt to seed default
        if (!error && data && data.length === 0) {
          const local = LocalStore.getCompany();
          const clean = sanitizePayload(local as any, KNOWN_COMPANY_COLUMNS);
          const { data: inserted, error: insertError } = await supabase
            .from("companies")
            .upsert(clean, { onConflict: "id" })
            .select()
            .single();

          if (!insertError && inserted) {
            const merged = { ...local, ...inserted };
            LocalStore.saveCompany(merged);
            return merged;
          }
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
        const cleanPayload = sanitizePayload(updated as any, KNOWN_COMPANY_COLUMNS);
        const { data, error } = await supabase
          .from("companies")
          .upsert(cleanPayload, { onConflict: "id" })
          .select()
          .single();

        if (!error && data) {
          const merged = { ...updated, ...data };
          LocalStore.saveCompany(merged);
          await AuditService.log({
            action: "UPDATE_COMPANY_SETTINGS",
            entity_type: "company",
            entity_id: existing.id,
            old_data: existing,
            new_data: merged,
          });
          return merged;
        } else if (error) {
          console.warn("Supabase upsert company error:", error.message);
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
          .limit(1);

        if (!error && data && data.length > 0) {
          const sett = data[0] as CompanySettings;
          LocalStore.saveSettings(sett);
          return sett;
        }

        // If settings table is empty, attempt to seed default
        if (!error && data && data.length === 0) {
          const local = LocalStore.getSettings();
          const clean = sanitizePayload(local as any, KNOWN_SETTINGS_COLUMNS);
          const { data: inserted, error: insertError } = await supabase
            .from("company_settings")
            .upsert(clean, { onConflict: "id" })
            .select()
            .single();

          if (!insertError && inserted) {
            const merged = { ...local, ...inserted };
            LocalStore.saveSettings(merged);
            return merged;
          }
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
        const cleanPayload = sanitizePayload(updated as any, KNOWN_SETTINGS_COLUMNS);
        const { data, error } = await supabase
          .from("company_settings")
          .upsert(cleanPayload, { onConflict: "id" })
          .select()
          .single();

        if (!error && data) {
          const merged = { ...updated, ...data };
          LocalStore.saveSettings(merged);
          await AuditService.log({
            action: "UPDATE_SYSTEM_SETTINGS",
            entity_type: "settings",
            entity_id: existing.id,
            old_data: existing,
            new_data: merged,
          });
          return merged;
        } else if (error) {
          console.warn("Supabase upsert settings error:", error.message);
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
