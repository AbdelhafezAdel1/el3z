import { ServiceItem } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore, defaultCompany } from "./storage/localStore";
import { CompanyService } from "./companyService";
import { AuditService } from "./audit";

export class ServiceCatalog {
  static async getServices(): Promise<ServiceItem[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          LocalStore.saveServices(data);
          return data;
        }
      } catch (err) {
        console.warn(
          "Supabase fetch services failed, fallback to local store:",
          err,
        );
      }
    }
    return LocalStore.getServices();
  }

  static async getServiceById(id: string): Promise<ServiceItem | null> {
    const services = await this.getServices();
    return services.find((s) => s.id === id) || null;
  }

  static async createService(
    serviceData: Omit<ServiceItem, "id" | "created_at" | "updated_at" | "company_id"> & {
      company_id?: string;
    },
  ): Promise<ServiceItem> {
    const comp = await CompanyService.getCompany();
    const resolvedCompanyId =
      serviceData.company_id || (comp?.id && !comp.id.startsWith("a0000000") ? comp.id : defaultCompany.id);

    const newService: ServiceItem = {
      ...serviceData,
      id: crypto.randomUUID(),
      company_id: resolvedCompanyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Immediate local persistence
    const current = LocalStore.getServices();
    const updated = [newService, ...current.filter((s) => s.id !== newService.id)];
    LocalStore.saveServices(updated);

    if (isSupabaseConfigured) {
      try {
        const payload: Record<string, unknown> = {
          id: newService.id,
          name_ar: newService.name_ar,
          name_en: newService.name_en || null,
          description_ar: newService.description_ar || null,
          description_en: newService.description_en || null,
          default_price: newService.default_price,
          vat_rate: newService.vat_rate,
          unit_ar: newService.unit_ar || "خدمة",
          unit_en: newService.unit_en || "Service",
          is_active: newService.is_active ?? true,
        };

        if (comp?.id && !comp.id.startsWith("a0000000")) {
          payload.company_id = comp.id;
        }

        const { data, error } = await supabase
          .from("services")
          .insert(payload)
          .select()
          .single();
        if (!error && data) {
          const synced = [data, ...current.filter((s) => s.id !== data.id)];
          LocalStore.saveServices(synced);
          await AuditService.log({
            action: "CREATE_SERVICE",
            entity_type: "service",
            entity_id: data.id,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase insert service failed:", err);
      }
    }

    await AuditService.log({
      action: "CREATE_SERVICE",
      entity_type: "service",
      entity_id: newService.id,
      new_data: newService,
    });

    return newService;
  }

  static async updateService(
    id: string,
    updates: Partial<ServiceItem>,
  ): Promise<ServiceItem> {
    const existing = await this.getServiceById(id);

    const current = LocalStore.getServices();
    const updatedService: ServiceItem = {
      ...(existing || ({} as ServiceItem)),
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const updatedList = current.map((s) => (s.id === id ? updatedService : s));
    LocalStore.saveServices(updatedList);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("services")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          const synced = current.map((s) => (s.id === id ? data : s));
          LocalStore.saveServices(synced);
          await AuditService.log({
            action: "UPDATE_SERVICE",
            entity_type: "service",
            entity_id: id,
            old_data: existing,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase update service failed:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_SERVICE",
      entity_type: "service",
      entity_id: id,
      old_data: existing,
      new_data: updatedService,
    });

    return updatedService;
  }

  static async deleteService(id: string): Promise<boolean> {
    const existing = await this.getServiceById(id);

    const current = LocalStore.getServices();
    const filtered = current.filter((s) => s.id !== id);
    LocalStore.saveServices(filtered);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("services").delete().eq("id", id);
        if (!error) {
          await AuditService.log({
            action: "DELETE_SERVICE",
            entity_type: "service",
            entity_id: id,
            old_data: existing,
          });
          return true;
        }
      } catch (err) {
        console.warn("Supabase delete service failed:", err);
      }
    }

    await AuditService.log({
      action: "DELETE_SERVICE",
      entity_type: "service",
      entity_id: id,
      old_data: existing,
    });

    return true;
  }
}
