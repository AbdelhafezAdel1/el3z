import { Customer, Invoice } from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore, defaultCompany } from "./storage/localStore";
import { CompanyService } from "./companyService";
import { AuditService } from "./audit";

export interface CustomerStats {
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
}

export class CustomerService {
  static async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          LocalStore.saveCustomers(data);
          return data;
        }
        if (error) {
          console.warn("Supabase fetch customers warning:", error.message);
        }
      } catch (err) {
        console.warn("Supabase fetch failed, fallback to local store:", err);
      }
    }
    return LocalStore.getCustomers();
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  }

  static async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*, items:invoice_items(*)")
          .eq("customer_id", customerId)
          .order("issue_date", { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase getCustomerInvoices failed, fallback to local store:", err);
      }
    }

    const invoices = LocalStore.getInvoices();
    return invoices.filter((inv) => inv.customer_id === customerId);
  }

  static async getCustomerStats(customerId: string): Promise<CustomerStats> {
    const invoices = await this.getCustomerInvoices(customerId);
    const totalInvoices = invoices.length;
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + (Number(inv.grand_total) || 0),
      0,
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + (Number(inv.paid_amount) || 0),
      0,
    );
    const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

    return {
      totalInvoices,
      totalInvoiced,
      totalPaid,
      outstandingBalance,
    };
  }

  static async createCustomer(
    customerData: Omit<Customer, "id" | "created_at" | "updated_at" | "company_id"> & {
      company_id?: string;
      is_active?: boolean;
    },
  ): Promise<Customer> {
    // Resolve valid company ID
    const comp = await CompanyService.getCompany();
    const resolvedCompanyId =
      customerData.company_id || (comp?.id && !comp.id.startsWith("a0000000") ? comp.id : defaultCompany.id);

    const newCustomer: Customer = {
      ...customerData,
      is_active: customerData.is_active ?? true,
      company_id: resolvedCompanyId,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Always guarantee immediate local store persistence so the UI counter & table update instantly
    const current = LocalStore.getCustomers();
    const updated = [newCustomer, ...current.filter((c) => c.id !== newCustomer.id)];
    LocalStore.saveCustomers(updated);

    if (isSupabaseConfigured) {
      try {
        const payload: Record<string, unknown> = {
          id: newCustomer.id,
          customer_type: newCustomer.customer_type,
          name_ar: newCustomer.name_ar,
          name_en: newCustomer.name_en || null,
          company_name: newCustomer.company_name || null,
          vat_number: newCustomer.vat_number || null,
          cr_number: newCustomer.cr_number || null,
          building_no: newCustomer.building_no || null,
          street: newCustomer.street || null,
          district: newCustomer.district || null,
          city: newCustomer.city || "الرياض",
          postal_code: newCustomer.postal_code || null,
          country: newCustomer.country || "المملكة العربية السعودية",
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
          notes: newCustomer.notes || null,
          is_active: newCustomer.is_active,
        };

        // If we have a valid company in database, attach company_id
        if (comp?.id && !comp.id.startsWith("a0000000")) {
          payload.company_id = comp.id;
        }

        const { data, error } = await supabase
          .from("customers")
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          const synced = [data, ...current.filter((c) => c.id !== data.id)];
          LocalStore.saveCustomers(synced);
          await AuditService.log({
            action: "CREATE_CUSTOMER",
            entity_type: "customer",
            entity_id: data.id,
            new_data: data,
          });
          return data;
        } else if (error) {
          console.warn("Supabase customer insert warning (saved locally):", error.message);
        }
      } catch (err) {
        console.warn("Supabase insert failed, stored locally:", err);
      }
    }

    await AuditService.log({
      action: "CREATE_CUSTOMER",
      entity_type: "customer",
      entity_id: newCustomer.id,
      new_data: newCustomer,
    });

    return newCustomer;
  }

  static async updateCustomer(
    id: string,
    updates: Partial<Customer>,
  ): Promise<Customer> {
    const existing = await this.getCustomerById(id);

    // Update LocalStore immediately
    const current = LocalStore.getCustomers();
    const updatedCustomer: Customer = {
      ...(existing || ({} as Customer)),
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const updatedList = current.map((c) => (c.id === id ? updatedCustomer : c));
    LocalStore.saveCustomers(updatedList);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          const synced = current.map((c) => (c.id === id ? data : c));
          LocalStore.saveCustomers(synced);
          await AuditService.log({
            action: "UPDATE_CUSTOMER",
            entity_type: "customer",
            entity_id: id,
            old_data: existing,
            new_data: data,
          });
          return data;
        }
      } catch (err) {
        console.warn("Supabase update failed, fallback to local store:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_CUSTOMER",
      entity_type: "customer",
      entity_id: id,
      old_data: existing,
      new_data: updatedCustomer,
    });

    return updatedCustomer;
  }

  static async deleteCustomer(id: string): Promise<boolean> {
    const existing = await this.getCustomerById(id);

    const current = LocalStore.getCustomers();
    const filtered = current.filter((c) => c.id !== id);
    LocalStore.saveCustomers(filtered);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("id", id);
        if (!error) {
          await AuditService.log({
            action: "DELETE_CUSTOMER",
            entity_type: "customer",
            entity_id: id,
            old_data: existing,
          });
          return true;
        }
      } catch (err) {
        console.warn("Supabase delete failed, fallback to local store:", err);
      }
    }

    await AuditService.log({
      action: "DELETE_CUSTOMER",
      entity_type: "customer",
      entity_id: id,
      old_data: existing,
    });

    return true;
  }
}
