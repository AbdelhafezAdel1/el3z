import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from "../types/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LocalStore, defaultCompany } from "./storage/localStore";
import { CustomerService } from "./customerService";
import { CompanyService } from "./companyService";
import { ZatcaService } from "../integrations/zatca";
import { AuditService } from "./audit";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  LineCalculationResult,
} from "../lib/money";

export interface CreateInvoiceInput {
  customerId: string;
  invoiceType?: "tax_invoice" | "simplified_tax_invoice" | "credit_note" | "debit_note";
  issueDate?: string;
  supplyDate?: string;
  dueDate?: string;
  notes?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  items: Array<{
    serviceId?: string;
    descriptionAr: string;
    descriptionEn?: string;
    quantity: number;
    unitPrice: number;
    discountRate?: number;
    vatRate?: number;
  }>;
  status?: InvoiceStatus;
}

export class InvoiceService {
  static async getInvoices(): Promise<Invoice[]> {
    const customers = await CustomerService.getCustomers();
    const company = await CompanyService.getCompany();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*, customer:customers(*), items:invoice_items(*)")
          .order("issue_date", { ascending: false });

        if (!error && data && data.length > 0) {
          const hydrated = data.map((inv: any) => ({
            ...inv,
            company: company || undefined,
          }));
          LocalStore.saveInvoices(hydrated);
          return hydrated;
        }
      } catch (err) {
        console.warn("Supabase fetch invoices failed, fallback to localStore:", err);
      }
    }

    return LocalStore.getInvoices();
  }

  static async getInvoiceById(id: string): Promise<Invoice | null> {
    const list = await this.getInvoices();
    return list.find((i) => i.id === id) || null;
  }

  static async getNextInvoiceNumber(): Promise<string> {
    const list = LocalStore.getInvoices();
    if (list.length === 0) return "INV-2026-000001";

    const nums = list
      .map((i) => {
        const match = i.invoice_number?.match(/INV-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-2026-${String(maxNum + 1).padStart(6, "0")}`;
  }

  static async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const company = await CompanyService.getCompany();
    const customer = await CustomerService.getCustomerById(input.customerId);
    const invoiceNumber = await this.getNextInvoiceNumber();
    const invoiceId = crypto.randomUUID();

    // Calculate line items
    const processedLines: LineCalculationResult[] = [];
    const itemsToSave: InvoiceItem[] = input.items.map((it, idx) => {
      const calc = calculateLineItem({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountRate: it.discountRate || 0,
        vatRate: it.vatRate !== undefined ? it.vatRate : 15,
      });
      processedLines.push(calc);

      return {
        id: crypto.randomUUID(),
        invoice_id: invoiceId,
        service_id: it.serviceId,
        item_order: idx + 1,
        description_ar: it.descriptionAr,
        description_en: it.descriptionEn,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount_rate: it.discountRate || 0,
        discount_amount: calc.discountAmount,
        taxable_amount: calc.taxableAmount,
        vat_rate: it.vatRate !== undefined ? it.vatRate : 15,
        vat_amount: calc.vatAmount,
        line_total: calc.lineTotal,
      };
    });

    const totals = calculateInvoiceTotals(processedLines);

    // Build invoice object
    const now = new Date();
    const issueDate = input.issueDate || now.toISOString().split("T")[0];
    const issueTime = now.toTimeString().split(" ")[0];

    const realCompanyId =
      company?.id && !company.id.startsWith("a0000000") ? company.id : defaultCompany.id;

    const newInvoice: Invoice = {
      id: invoiceId,
      company_id: realCompanyId,
      customer_id: input.customerId,
      invoice_number: invoiceNumber,
      invoice_type: input.invoiceType || "tax_invoice",
      issue_date: issueDate,
      issue_time: issueTime,
      supply_date: input.supplyDate,
      due_date: input.dueDate,
      status: input.status || "draft",
      zatca_status: "not_submitted",
      subtotal: totals.subtotal,
      discount_amount: totals.discountTotal,
      taxable_amount: totals.taxableTotal,
      vat_amount: totals.vatTotal,
      grand_total: totals.grandTotal,
      paid_amount: 0,
      notes: input.notes,
      payment_method: input.paymentMethod || "bank_transfer",
      customer: customer || undefined,
      company: company || undefined,
      items: itemsToSave,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Generate ZATCA Phase 1 / 2 QR Code
    const sellerName = company?.name_ar || "شركة العز للمقاولات";
    const vatNumber = company?.vat_number || "310123456700003";
    try {
      const qrRes = await ZatcaService.generateQRCode({
        sellerName,
        vatNumber,
        timestamp: `${newInvoice.issue_date}T${newInvoice.issue_time}`,
        totalAmount: (newInvoice.grand_total || 0).toFixed(2),
        vatAmount: (newInvoice.vat_amount || 0).toFixed(2),
      });
      newInvoice.qr_code_data = qrRes.tlvBase64;
    } catch {
      // ignore
    }

    // Always guarantee immediate local store persistence
    const currentInvoices = LocalStore.getInvoices();
    LocalStore.saveInvoices([newInvoice, ...currentInvoices.filter((i) => i.id !== newInvoice.id)]);

    if (isSupabaseConfigured) {
      try {
        const invPayload: Record<string, unknown> = {
          id: newInvoice.id,
          customer_id: newInvoice.customer_id,
          invoice_number: newInvoice.invoice_number,
          invoice_type: newInvoice.invoice_type,
          issue_date: newInvoice.issue_date,
          issue_time: newInvoice.issue_time,
          supply_date: newInvoice.supply_date || null,
          due_date: newInvoice.due_date || null,
          status: newInvoice.status,
          zatca_status: newInvoice.zatca_status,
          subtotal: newInvoice.subtotal,
          discount_amount: newInvoice.discount_amount,
          taxable_amount: newInvoice.taxable_amount,
          vat_amount: newInvoice.vat_amount,
          grand_total: newInvoice.grand_total,
          paid_amount: newInvoice.paid_amount,
          qr_code_data: newInvoice.qr_code_data,
          notes: newInvoice.notes || null,
          payment_method: newInvoice.payment_method,
          payment_terms: newInvoice.payment_terms || null,
        };

        if (company?.id && !company.id.startsWith("a0000000")) {
          invPayload.company_id = company.id;
        }

        const { data: invData, error: invError } = await supabase
          .from("invoices")
          .insert(invPayload)
          .select()
          .single();

        if (!invError && invData) {
          await supabase.from("invoice_items").insert(itemsToSave);
          const synced = [newInvoice, ...currentInvoices.filter((i) => i.id !== newInvoice.id)];
          LocalStore.saveInvoices(synced);
          await AuditService.log({
            action: "CREATE_INVOICE",
            entity_type: "invoice",
            entity_id: newInvoice.id,
            new_data: newInvoice,
          });
          return newInvoice;
        } else if (invError) {
          console.warn("Supabase invoice insert warning (saved locally):", invError.message);
        }
      } catch (err) {
        console.warn("Supabase invoice insert failed, saved locally:", err);
      }
    }

    await AuditService.log({
      action: "CREATE_INVOICE",
      entity_type: "invoice",
      entity_id: newInvoice.id,
      new_data: newInvoice,
    });

    return newInvoice;
  }

  static async duplicateInvoice(sourceId: string): Promise<Invoice> {
    const source = await this.getInvoiceById(sourceId);
    if (!source) {
      throw new Error("الفاتورة المراد نسخها غير موجودة");
    }

    if (!source.items || source.items.length === 0) {
      throw new Error("لا توجد بنود في الفاتورة المراد نسخها");
    }

    return this.createInvoice({
      customerId: source.customer_id,
      invoiceType:
        source.invoice_type === "credit_note" || source.invoice_type === "debit_note"
          ? "tax_invoice"
          : source.invoice_type,
      issueDate: new Date().toISOString().split("T")[0],
      supplyDate: new Date().toISOString().split("T")[0],
      dueDate: undefined,
      paymentMethod: source.payment_method || "bank_transfer",
      notes: source.notes,
      status: "draft",
      items: source.items.map((item) => ({
        serviceId: item.service_id,
        descriptionAr: item.description_ar,
        descriptionEn: item.description_en,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discountRate: item.discount_rate || 0,
        vatRate: item.vat_rate,
      })),
    });
  }

  static async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
  ): Promise<Invoice | null> {
    const existing = await this.getInvoiceById(id);
    if (!existing) return null;

    if (existing.zatca_status === "accepted" && status === "draft") {
      throw new Error(
        "لا يمكن إعادة الفاتورة إلى مسودة بعد اعتمادها من هيئة الزكاة والضريبة",
      );
    }

    const updated: Invoice = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
    };

    const list = LocalStore.getInvoices().map((inv) =>
      inv.id === id ? updated : inv,
    );
    LocalStore.saveInvoices(list);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("invoices")
          .update({ status, updated_at: updated.updated_at })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase status update failed:", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_INVOICE_STATUS",
      entity_type: "invoice",
      entity_id: id,
      old_data: { status: existing.status },
      new_data: { status },
    });

    return updated;
  }

  static async submitToZatca(
    id: string,
  ): Promise<{ success: boolean; message: string; invoice: Invoice }> {
    const existing = await this.getInvoiceById(id);
    if (!existing) {
      throw new Error("الفاتورة غير موجودة");
    }

    if (existing.zatca_status === "accepted") {
      return {
        success: true,
        message: "الفاتورة معتمدة مسبقاً لدى هيئة الزكاة والضريبة",
        invoice: existing,
      };
    }

    const settings = await CompanyService.getSettings();
    const submissionResult = await ZatcaService.submitInvoice(existing, {
      environment: settings.zatca_environment,
    });

    const updated: Invoice = {
      ...existing,
      zatca_status: submissionResult.status,
      invoice_hash: submissionResult.invoiceHash,
      qr_code_data: submissionResult.qrBase64,
      ubl_xml: submissionResult.xmlPayload,
      status:
        submissionResult.success && existing.status === "draft"
          ? "issued"
          : existing.status,
      updated_at: new Date().toISOString(),
    };

    const list = LocalStore.getInvoices().map((inv) =>
      inv.id === id ? updated : inv,
    );
    LocalStore.saveInvoices(list);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("invoices")
          .update({
            zatca_status: updated.zatca_status,
            invoice_hash: updated.invoice_hash,
            qr_code_data: updated.qr_code_data,
            ubl_xml: updated.ubl_xml,
            status: updated.status,
            updated_at: updated.updated_at,
          })
          .eq("id", id);

        await supabase.from("zatca_submissions").insert({
          invoice_id: id,
          submission_uuid: submissionResult.submissionId,
          environment: settings.zatca_environment,
          zatca_status: submissionResult.status,
          error_code: submissionResult.errorCode,
          error_message: submissionResult.errorMessage,
        });
      } catch (err) {
        console.warn("Supabase ZATCA update failed:", err);
      }
    }

    // Save submission record
    const submissions = LocalStore.getSubmissions();
    LocalStore.saveSubmissions([
      {
        id: crypto.randomUUID(),
        invoice_id: id,
        submission_uuid: submissionResult.submissionId,
        environment: settings.zatca_environment,
        zatca_status: submissionResult.status,
        error_code: submissionResult.errorCode,
        error_message: submissionResult.errorMessage,
        submitted_at: new Date().toISOString(),
      },
      ...submissions,
    ]);

    await AuditService.log({
      action: "SUBMIT_ZATCA",
      entity_type: "invoice",
      entity_id: id,
      new_data: {
        zatca_status: submissionResult.status,
        submission_id: submissionResult.submissionId,
      },
    });

    return {
      success: submissionResult.success,
      message: submissionResult.success
        ? "تم رفع واعتماد الفاتورة بنجاح لدى هيئة الزكاة والضريبة والجمارك"
        : `تعذر اعتماد الفاتورة: ${submissionResult.errorMessage}`,
      invoice: updated,
    };
  }

  static async updateInvoice(
    id: string,
    input: CreateInvoiceInput,
  ): Promise<Invoice> {
    const existing = await this.getInvoiceById(id);
    if (!existing) {
      throw new Error("الفاتورة المراد تعديلها غير موجودة");
    }

    if (existing.zatca_status === "accepted") {
      throw new Error("لا يمكن تعديل فاتورة معتمدة رسمياً لدى هيئة الزكاة والضريبة والجمارك");
    }

    const customers = LocalStore.getCustomers();
    const customer = customers.find((c) => c.id === input.customerId);
    const company = await CompanyService.getCompany();

    // Recalculate line items
    const lineCalculations = input.items.map((item) =>
      calculateLineItem({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate,
        vatRate: item.vatRate,
      })
    );

    const totals = calculateInvoiceTotals(lineCalculations);

    const itemsToSave: InvoiceItem[] = input.items.map((item, idx) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      item_order: idx + 1,
      service_id: item.serviceId,
      description_ar: item.descriptionAr,
      description_en: item.descriptionEn,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unitPrice) || 0,
      discount_rate: Number(item.discountRate) || 0,
      discount_amount: lineCalculations[idx].discountAmount,
      vat_rate: item.vatRate !== undefined ? Number(item.vatRate) : 15,
      taxable_amount: lineCalculations[idx].taxableAmount,
      vat_amount: lineCalculations[idx].vatAmount,
      line_total: lineCalculations[idx].lineTotal,
    }));

    const updatedInvoice: Invoice = {
      ...existing,
      customer_id: input.customerId,
      invoice_type: (input.invoiceType || existing.invoice_type) as Invoice["invoice_type"],
      issue_date: input.issueDate || existing.issue_date,
      supply_date: input.supplyDate,
      due_date: input.dueDate,
      status: input.status || existing.status,
      subtotal: totals.subtotal,
      discount_amount: totals.discountTotal,
      taxable_amount: totals.taxableTotal,
      vat_amount: totals.vatTotal,
      grand_total: totals.grandTotal,
      notes: input.notes,
      payment_method: input.paymentMethod || "bank_transfer",
      customer: customer || undefined,
      company: company || undefined,
      items: itemsToSave,
      updated_at: new Date().toISOString(),
    };

    // Regenerate ZATCA QR
    const sellerName = company?.name_ar || "شركة العز للمقاولات";
    const vatNumber = company?.vat_number || "310123456700003";
    try {
      const qrRes = await ZatcaService.generateQRCode({
        sellerName,
        vatNumber,
        timestamp: `${updatedInvoice.issue_date}T${updatedInvoice.issue_time}`,
        totalAmount: (updatedInvoice.grand_total || 0).toFixed(2),
        vatAmount: (updatedInvoice.vat_amount || 0).toFixed(2),
      });
      updatedInvoice.qr_code_data = qrRes.tlvBase64;
    } catch {
      // ignore
    }

    // Save to LocalStore
    const currentInvoices = LocalStore.getInvoices();
    LocalStore.saveInvoices(
      currentInvoices.map((inv) => (inv.id === id ? updatedInvoice : inv))
    );

    // Sync to Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("invoices")
          .update({
            customer_id: updatedInvoice.customer_id,
            invoice_type: updatedInvoice.invoice_type,
            issue_date: updatedInvoice.issue_date,
            supply_date: updatedInvoice.supply_date || null,
            due_date: updatedInvoice.due_date || null,
            status: updatedInvoice.status,
            subtotal: updatedInvoice.subtotal,
            discount_amount: updatedInvoice.discount_amount,
            taxable_amount: updatedInvoice.taxable_amount,
            vat_amount: updatedInvoice.vat_amount,
            grand_total: updatedInvoice.grand_total,
            qr_code_data: updatedInvoice.qr_code_data,
            notes: updatedInvoice.notes || null,
            payment_method: updatedInvoice.payment_method,
            payment_terms: updatedInvoice.payment_terms || null,
            updated_at: updatedInvoice.updated_at,
          })
          .eq("id", id);

        await supabase.from("invoice_items").delete().eq("invoice_id", id);
        await supabase.from("invoice_items").insert(itemsToSave);
      } catch (err) {
        console.warn("Supabase invoice update warning (saved locally):", err);
      }
    }

    await AuditService.log({
      action: "UPDATE_INVOICE",
      entity_type: "invoice",
      entity_id: id,
      old_data: existing,
      new_data: updatedInvoice,
    });

    return updatedInvoice;
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    const existing = await this.getInvoiceById(id);
    if (!existing) return false;

    if (existing.zatca_status === "accepted") {
      throw new Error(
        "لا يمكن حذف فاتورة تم اعتمادها رسمياً لدى هيئة الزكاة والضريبة (يجب إصدار إشعار دائن/إلغاء)",
      );
    }

    const list = LocalStore.getInvoices().filter((inv) => inv.id !== id);
    LocalStore.saveInvoices(list);

    if (isSupabaseConfigured) {
      try {
        await supabase.from("invoice_items").delete().eq("invoice_id", id);
        await supabase.from("invoices").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase invoice delete failed:", err);
      }
    }

    await AuditService.log({
      action: "DELETE_INVOICE",
      entity_type: "invoice",
      entity_id: id,
      old_data: existing,
    });

    return true;
  }
}
