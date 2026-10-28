import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore, defaultCompany, defaultSettings } from "./storage/localStore";
import { Company, CompanySettings, Customer, Invoice, ServiceItem, Voucher } from "../types/database";

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  uploadedCount: number;
  downloadedCount: number;
  error?: string;
}

export class SyncService {
  private static isRunning = false;

  /**
   * Run full bi-directional synchronization between device LocalStorage and Supabase Cloud.
   * - Uploads any local records created while offline or before server configuration.
   * - Downloads latest server records to local storage.
   */
  static async syncAll(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: "إعدادات الربط السحابي غير مفعلة" };
    }

    if (this.isRunning) {
      return { success: true, message: "المزامنة جارية بالفعل..." };
    }

    this.isRunning = true;

    try {
      // 1. Sync Company Info
      await this.syncCompany();

      // 2. Sync Company Settings
      await this.syncSettings();

      // 3. Sync Customers
      await this.syncCustomers();

      // 4. Sync Services
      await this.syncServices();

      // 5. Sync Invoices
      await this.syncInvoices();

      // 6. Sync Vouchers
      await this.syncVouchers();

      localStorage.setItem("alezz_last_cloud_sync", new Date().toISOString());
      return { success: true, message: "تمت المزامنة السحابية بنجاح" };
    } catch (err: any) {
      console.warn("Sync error:", err);
      return { success: false, message: err?.message || "تعذر إتمام المزامنة السحابية" };
    } finally {
      this.isRunning = false;
    }
  }

  private static async syncCompany(): Promise<void> {
    try {
      const localComp = LocalStore.getCompany();
      const { data: serverComps, error } = await supabase
        .from("companies")
        .select("*")
        .limit(1);

      if (!error && serverComps && serverComps.length > 0) {
        const serverComp = serverComps[0] as Company;
        const localDate = new Date(localComp.updated_at || 0).getTime();
        const serverDate = new Date(serverComp.updated_at || 0).getTime();

        // If local was edited more recently than server, update server
        if (localDate > serverDate && localComp.name_ar) {
          const payload = {
            id: serverComp.id,
            name_ar: localComp.name_ar,
            name_en: localComp.name_en,
            vat_number: localComp.vat_number,
            cr_number: localComp.cr_number,
            building_no: localComp.building_no,
            street_ar: localComp.street_ar,
            street_en: localComp.street_en,
            district_ar: localComp.district_ar,
            district_en: localComp.district_en,
            city_ar: localComp.city_ar,
            city_en: localComp.city_en,
            postal_code: localComp.postal_code,
            country_code: localComp.country_code,
            phone: localComp.phone,
            email: localComp.email,
            website: localComp.website,
            iban: localComp.iban,
            bank_account_number: localComp.bank_account_number,
            bank_name_ar: localComp.bank_name_ar,
            bank_name_en: localComp.bank_name_en,
            logo_url: localComp.logo_url,
            updated_at: new Date().toISOString(),
          };
          const { data: updated } = await supabase
            .from("companies")
            .upsert(payload, { onConflict: "id" })
            .select()
            .single();

          if (updated) {
            LocalStore.saveCompany({ ...localComp, ...updated });
          }
        } else {
          // Server is newer or equal, update local
          LocalStore.saveCompany({ ...localComp, ...serverComp });
        }
      } else if (!error && serverComps && serverComps.length === 0) {
        // Table empty on server, push local
        await supabase.from("companies").upsert(localComp, { onConflict: "id" });
      }
    } catch (e) {
      console.warn("syncCompany failed:", e);
    }
  }

  private static async syncSettings(): Promise<void> {
    try {
      const localSett = LocalStore.getSettings();
      const { data: serverSetts, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1);

      if (!error && serverSetts && serverSetts.length > 0) {
        const serverSett = serverSetts[0] as CompanySettings;
        LocalStore.saveSettings({ ...localSett, ...serverSett });
      } else if (!error && serverSetts && serverSetts.length === 0) {
        await supabase.from("company_settings").upsert(localSett, { onConflict: "id" });
      }
    } catch (e) {
      console.warn("syncSettings failed:", e);
    }
  }

  private static async syncCustomers(): Promise<void> {
    try {
      const localCustomers = LocalStore.getCustomers();
      const { data: serverCustomers, error } = await supabase
        .from("customers")
        .select("*");

      if (error) return;

      const serverList = (serverCustomers || []) as Customer[];
      const serverIds = new Set(serverList.map((c) => c.id));

      // 1. Upload local customers not in server
      const toUpload = localCustomers.filter((c) => !serverIds.has(c.id));
      if (toUpload.length > 0) {
        const company = LocalStore.getCompany();
        const compId = company.id || defaultCompany.id;

        for (const cust of toUpload) {
          const payload = {
            id: cust.id,
            company_id: cust.company_id || compId,
            customer_type: cust.customer_type || "individual",
            name_ar: cust.name_ar,
            name_en: cust.name_en || null,
            company_name: cust.company_name || null,
            vat_number: cust.vat_number || null,
            cr_number: cust.cr_number || null,
            building_no: cust.building_no || null,
            street: cust.street || null,
            district: cust.district || null,
            city: cust.city || "الخبر",
            postal_code: cust.postal_code || null,
            country: cust.country || "المملكة العربية السعودية",
            phone: cust.phone || null,
            email: cust.email || null,
            notes: cust.notes || null,
            is_active: cust.is_active ?? true,
            created_at: cust.created_at || new Date().toISOString(),
            updated_at: cust.updated_at || new Date().toISOString(),
          };
          await supabase.from("customers").upsert(payload, { onConflict: "id" });
        }
      }

      // 2. Fetch fresh merged list from server
      const { data: freshServer } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (freshServer && freshServer.length > 0) {
        LocalStore.saveCustomers(freshServer);
      }
    } catch (e) {
      console.warn("syncCustomers failed:", e);
    }
  }

  private static async syncServices(): Promise<void> {
    try {
      const localServices = LocalStore.getServices();
      const { data: serverServices, error } = await supabase
        .from("services")
        .select("*");

      if (error) return;

      const serverList = (serverServices || []) as ServiceItem[];
      const serverIds = new Set(serverList.map((s) => s.id));

      // Upload local services not in server
      const toUpload = localServices.filter((s) => !serverIds.has(s.id));
      if (toUpload.length > 0) {
        const company = LocalStore.getCompany();
        const compId = company.id || defaultCompany.id;

        for (const s of toUpload) {
          const payload = {
            id: s.id,
            company_id: s.company_id || compId,
            name_ar: s.name_ar,
            name_en: s.name_en || null,
            description_ar: s.description_ar || null,
            description_en: s.description_en || null,
            default_price: s.default_price || 0,
            vat_rate: s.vat_rate || 15.0,
            unit_ar: s.unit_ar || "خدمة",
            unit_en: s.unit_en || "Service",
            is_active: s.is_active ?? true,
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString(),
          };
          await supabase.from("services").upsert(payload, { onConflict: "id" });
        }
      }

      const { data: freshServer } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (freshServer && freshServer.length > 0) {
        LocalStore.saveServices(freshServer);
      }
    } catch (e) {
      console.warn("syncServices failed:", e);
    }
  }

  private static async syncInvoices(): Promise<void> {
    try {
      const localInvoices = LocalStore.getInvoices();
      const { data: serverInvoices, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)");

      if (error) return;

      const serverList = (serverInvoices || []) as any[];
      const serverIds = new Set(serverList.map((i) => i.id));

      // 1. Upload local invoices not in server
      const toUpload = localInvoices.filter((inv) => !serverIds.has(inv.id));
      if (toUpload.length > 0) {
        const company = LocalStore.getCompany();
        const compId = company.id || defaultCompany.id;

        for (const inv of toUpload) {
          const payload = {
            id: inv.id,
            company_id: inv.company_id || compId,
            customer_id: inv.customer_id || null,
            invoice_number: inv.invoice_number,
            invoice_type: inv.invoice_type || "tax_invoice",
            issue_date: inv.issue_date,
            issue_time: inv.issue_time || "12:00:00",
            supply_date: inv.supply_date || null,
            due_date: inv.due_date || null,
            status: inv.status || "draft",
            zatca_status: inv.zatca_status || "not_submitted",
            subtotal: inv.subtotal || 0,
            discount_amount: inv.discount_amount || 0,
            taxable_amount: inv.taxable_amount || 0,
            vat_amount: inv.vat_amount || 0,
            grand_total: inv.grand_total || 0,
            paid_amount: inv.paid_amount || 0,
            qr_code_data: inv.qr_code_data || null,
            invoice_hash: inv.invoice_hash || null,
            ubl_xml: inv.ubl_xml || null,
            payment_method: inv.payment_method || "bank_transfer",
            payment_terms: inv.payment_terms || null,
            notes: inv.notes || null,
            created_at: inv.created_at || new Date().toISOString(),
            updated_at: inv.updated_at || new Date().toISOString(),
          };

          const { error: invErr } = await supabase
            .from("invoices")
            .upsert(payload, { onConflict: "id" });

          if (!invErr && inv.items && inv.items.length > 0) {
            for (const it of inv.items) {
              const itemPayload = {
                id: it.id || crypto.randomUUID(),
                invoice_id: inv.id,
                service_id: it.service_id || null,
                item_order: it.item_order || 1,
                description_ar: it.description_ar,
                description_en: it.description_en || null,
                quantity: it.quantity,
                unit_price: it.unit_price,
                discount_rate: it.discount_rate || 0,
                discount_amount: it.discount_amount || 0,
                taxable_amount: it.taxable_amount || 0,
                vat_rate: it.vat_rate || 15,
                vat_amount: it.vat_amount || 0,
                line_total: it.line_total || 0,
              };
              await supabase.from("invoice_items").upsert(itemPayload, { onConflict: "id" });
            }
          }
        }
      }

      // 2. Fetch fresh merged list from server
      const { data: freshServer } = await supabase
        .from("invoices")
        .select("*, customer:customers(*), items:invoice_items(*)")
        .order("issue_date", { ascending: false });

      if (freshServer && freshServer.length > 0) {
        const company = LocalStore.getCompany();
        const hydrated = freshServer.map((inv: any) => ({
          ...inv,
          company: company || undefined,
        }));
        LocalStore.saveInvoices(hydrated);
      }
    } catch (e) {
      console.warn("syncInvoices failed:", e);
    }
  }

  private static async syncVouchers(): Promise<void> {
    try {
      const localVouchers = LocalStore.getVouchers();
      const { data: serverVouchers, error } = await supabase
        .from("vouchers")
        .select("*");

      if (error) return;

      const serverList = (serverVouchers || []) as any[];
      const serverIds = new Set(serverList.map((v) => v.id));

      const toUpload = localVouchers.filter((v) => !serverIds.has(v.id));
      if (toUpload.length > 0) {
        for (const v of toUpload) {
          const payload = {
            id: v.id,
            voucher_number: v.voucher_number,
            type: v.type,
            date: v.date,
            amount: v.amount,
            customer_id: v.customer_id || null,
            customer_name: v.customer_name,
            payment_method: v.payment_method,
            reference_number: v.reference_number || null,
            invoice_id: v.invoice_id || null,
            invoice_number: v.invoice_number || null,
            description: v.description,
            notes: v.notes || null,
            created_at: v.created_at || new Date().toISOString(),
          };
          await supabase.from("vouchers").upsert(payload, { onConflict: "id" });
        }
      }

      const { data: freshServer } = await supabase
        .from("vouchers")
        .select("*")
        .order("date", { ascending: false });

      if (freshServer && freshServer.length > 0) {
        LocalStore.saveVouchers(freshServer as Voucher[]);
      }
    } catch (e) {
      console.warn("syncVouchers failed:", e);
    }
  }
}
