import { Invoice, ZatcaStatus, ZatcaSubmission } from "../../types/database";
import {
  ZatcaValidationResult,
  ZatcaQrFields,
  ZatcaQrResult,
  ZatcaSubmissionOptions,
  ZatcaSubmissionResult,
  ZatcaSubmissionStatusResult,
} from "./types";
import { validateInvoice } from "./validation";
import { generateInvoiceXML } from "./xml";
import { generateInvoiceHash } from "./hash";
import { generateQRCode } from "./qr";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { LocalStore } from "../../services/storage/localStore";
import { AuditService } from "../../services/audit";

export class ZatcaService {
  /**
   * 1. Validate Invoice against ZATCA Electronic Invoicing Rules
   */
  static validateInvoice(invoice: Invoice): ZatcaValidationResult {
    return validateInvoice(invoice);
  }

  /**
   * 2. Generate Canonical UBL 2.1 XML Document
   */
  static generateInvoiceXML(invoice: Invoice): string {
    return generateInvoiceXML(invoice);
  }

  /**
   * 3. Generate SHA-256 Invoice Hash
   */
  static async generateInvoiceHash(xmlString: string): Promise<string> {
    return generateInvoiceHash(xmlString);
  }

  /**
   * 4. Generate TLV QR Code Data and High-Res Image
   */
  static async generateQRCode(fields: ZatcaQrFields): Promise<ZatcaQrResult> {
    return generateQRCode(fields);
  }

  /**
   * 5. Submit Invoice (Intelligently routes to Clearance for Standard or Reporting for Simplified)
   */
  static async submitInvoice(
    invoice: Invoice,
    options?: ZatcaSubmissionOptions,
  ): Promise<ZatcaSubmissionResult> {
    const isSimplified =
      invoice.invoice_type === "simplified_tax_invoice" ||
      !invoice.customer?.vat_number;

    if (isSimplified) {
      return this.reportInvoice(invoice, options);
    } else {
      return this.clearInvoice(invoice, options);
    }
  }

  /**
   * 6. Report Invoice (ZATCA Phase 2 Reporting for Simplified Tax Invoices - B2C)
   */
  static async reportInvoice(
    invoice: Invoice,
    options?: ZatcaSubmissionOptions,
  ): Promise<ZatcaSubmissionResult> {
    return this.executeSubmission(invoice, "REPORT", options);
  }

  /**
   * 7. Clear Invoice (ZATCA Phase 2 Clearance for Standard Tax Invoices - B2B)
   */
  static async clearInvoice(
    invoice: Invoice,
    options?: ZatcaSubmissionOptions,
  ): Promise<ZatcaSubmissionResult> {
    return this.executeSubmission(invoice, "CLEARANCE", options);
  }

  /**
   * 8. Get Status of a Prior Submission
   */
  static async getSubmissionStatus(
    submissionId: string,
  ): Promise<ZatcaSubmissionStatusResult> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("zatca_submissions")
          .select("*")
          .eq("submission_uuid", submissionId)
          .single();

        if (!error && data) {
          return {
            submissionId: data.submission_uuid,
            invoiceNumber: data.invoice?.invoice_number || "",
            status: data.zatca_status,
            environment: data.environment,
            submittedAt: data.submitted_at,
            clearedAt: data.zatca_status === "accepted" ? data.submitted_at : undefined,
            warnings: data.warning_messages || [],
            errors: data.error_message ? [data.error_message] : [],
          };
        }
      } catch (err) {
        console.warn("Supabase getSubmissionStatus error:", err);
      }
    }

    const localList = LocalStore.getSubmissions();
    const match = localList.find((s) => s.submission_uuid === submissionId || s.id === submissionId);

    if (match) {
      return {
        submissionId: match.submission_uuid,
        invoiceNumber: "",
        status: match.zatca_status,
        environment: match.environment,
        submittedAt: match.submitted_at,
        clearedAt: match.zatca_status === "accepted" ? match.submitted_at : undefined,
        warnings: match.warning_messages || [],
        errors: match.error_message ? [match.error_message] : [],
      };
    }

    return {
      submissionId,
      invoiceNumber: "",
      status: "not_submitted",
      environment: "sandbox",
      submittedAt: new Date().toISOString(),
      errors: ["لم يتم العثور على سجل الإرسالية المحدد"],
    };
  }

  /**
   * Internal Core Submission Engine
   */
  private static async executeSubmission(
    invoice: Invoice,
    operationType: "REPORT" | "CLEARANCE",
    options?: ZatcaSubmissionOptions,
  ): Promise<ZatcaSubmissionResult> {
    const environment = options?.environment || "sandbox";
    const mode = options?.mode || (environment === "production" ? "production" : "mock");
    const submissionId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();

    // Step A: Pre-submission Validation
    const validation = this.validateInvoice(invoice);
    if (!validation.isValid) {
      const errorResult: ZatcaSubmissionResult = {
        success: false,
        submissionId,
        status: "rejected",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        environment,
        mode,
        invoiceHash: "",
        qrBase64: "",
        qrDataUrl: "",
        xmlPayload: "",
        reportingStatus: "REJECTED",
        validationResult: validation,
        errorCode: "VALIDATION_FAILED",
        errorMessage: validation.errors.map((e) => e.messageAr).join(" | "),
        warningMessages: validation.warnings.map((w) => w.messageAr),
        isSimulated: mode !== "production",
        submittedAt,
      };

      await this.saveSubmissionLog(invoice.id, errorResult);
      return errorResult;
    }

    // Step B: Generate Canonical XML
    const xmlPayload = this.generateInvoiceXML(invoice);

    // Step C: Generate SHA-256 Hash
    const invoiceHash = await this.generateInvoiceHash(xmlPayload);

    // Step D: Generate TLV QR Code
    const sellerName = invoice.company?.name_ar || "شركة العز للمقاولات";
    const vatNumber = invoice.company?.vat_number || "310123456700003";
    const timestamp =
      invoice.issue_date && invoice.issue_time
        ? `${invoice.issue_date}T${invoice.issue_time}`
        : new Date().toISOString();
    const totalAmount = (invoice.grand_total || 0).toFixed(2);
    const vatAmount = (invoice.vat_amount || 0).toFixed(2);

    const qrResult = await this.generateQRCode({
      sellerName,
      vatNumber,
      timestamp,
      totalAmount,
      vatAmount,
      invoiceHash,
    });

    // Step E: Handle TEST / MOCK Mode
    if (mode === "test" || mode === "mock" || environment === "sandbox" || environment === "simulation") {
      // Simulate realistic network roundtrip
      await new Promise((resolve) => setTimeout(resolve, 600));

      const mockResult: ZatcaSubmissionResult = {
        success: true,
        submissionId,
        status: "accepted",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        environment,
        mode: "mock",
        invoiceHash,
        qrBase64: qrResult.tlvBase64,
        qrDataUrl: qrResult.qrDataUrl,
        xmlPayload,
        reportingStatus: operationType === "REPORT" ? "REPORTED" : "CLEARED",
        validationResult: validation,
        warningMessages: [
          ...validation.warnings.map((w) => w.messageAr),
          "عملية محاكاة تجريبية (Sandbox/Mock) - لم يتم الإرسال الفعلي لبيئة الإنتاج لهيئة الزكاة والضريبة",
        ],
        isSimulated: true,
        submittedAt,
        rawResponse: {
          simulated: true,
          operation: operationType,
          clearanceStatus: operationType === "CLEARANCE" ? "CLEARED_TEST" : undefined,
          reportingStatus: operationType === "REPORT" ? "REPORTED_TEST" : undefined,
          validationStatus: "PASS",
        },
      };

      await this.saveSubmissionLog(invoice.id, mockResult);
      return mockResult;
    }

    // Step F: Handle PRODUCTION Mode via Server-Side Supabase Edge Functions
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.functions.invoke("zatca-integration", {
          body: {
            operation: operationType,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            xmlPayload,
            invoiceHash,
            environment: "production",
          },
        });

        if (error) {
          throw new Error(error.message || "خطأ أثناء استدعاء خادم معالجة الزكاة");
        }

        const prodResult: ZatcaSubmissionResult = {
          success: data?.status === "accepted" || data?.success === true,
          submissionId: data?.submissionId || submissionId,
          status: (data?.status as ZatcaStatus) || "submitted",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          environment: "production",
          mode: "production",
          invoiceHash,
          qrBase64: data?.qrBase64 || qrResult.tlvBase64,
          qrDataUrl: data?.qrDataUrl || qrResult.qrDataUrl,
          xmlPayload,
          reportingStatus: data?.reportingStatus || (operationType === "REPORT" ? "REPORTED" : "CLEARED"),
          validationResult: validation,
          warningMessages: data?.warnings || [],
          isSimulated: false,
          submittedAt,
          rawResponse: data,
        };

        await this.saveSubmissionLog(invoice.id, prodResult);
        return prodResult;
      } else {
        throw new Error(
          "بيئة الإنتاج تتطلب ضبط بيانات الربط السحابي (Supabase Edge Functions) وشهادة الامتثال CSID",
        );
      }
    } catch (err: any) {
      const errorResult: ZatcaSubmissionResult = {
        success: false,
        submissionId,
        status: "error",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        environment: "production",
        mode: "production",
        invoiceHash,
        qrBase64: qrResult.tlvBase64,
        qrDataUrl: qrResult.qrDataUrl,
        xmlPayload,
        reportingStatus: "REJECTED",
        validationResult: validation,
        errorCode: "SERVER_INTEGRATION_ERROR",
        errorMessage: err.message || "تعذر إتمام عملية الربط مع هيئة الزكاة والضريبة والجمارك",
        isSimulated: false,
        submittedAt,
      };

      await this.saveSubmissionLog(invoice.id, errorResult);
      return errorResult;
    }
  }

  /**
   * Records submission log in zatca_submissions and triggers Audit Log
   */
  private static async saveSubmissionLog(
    invoiceId: string,
    result: ZatcaSubmissionResult,
  ): Promise<void> {
    const submissionItem: ZatcaSubmission = {
      id: crypto.randomUUID(),
      invoice_id: invoiceId,
      submission_uuid: result.submissionId,
      environment: result.environment as any,
      zatca_status: result.status,
      warning_messages: result.warningMessages,
      error_code: result.errorCode,
      error_message: result.errorMessage,
      request_payload: {
        invoiceNumber: result.invoiceNumber,
        mode: result.mode,
        isSimulated: result.isSimulated,
      },
      response_payload: result.rawResponse || {
        status: result.status,
        hash: result.invoiceHash,
      },
      submitted_at: result.submittedAt,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from("zatca_submissions").insert(submissionItem);
        // Also update invoice status
        await supabase
          .from("invoices")
          .update({
            zatca_status: result.status,
            qr_code_data: result.qrBase64,
            invoice_hash: result.invoiceHash,
            ubl_xml: result.xmlPayload,
            zatca_uuid: result.submissionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
      } catch (err) {
        console.warn("Supabase zatca_submissions insert error:", err);
      }
    }

    // Save to LocalStore
    const currentSubs = LocalStore.getSubmissions();
    LocalStore.saveSubmissions([submissionItem, ...currentSubs]);

    // Update local invoice
    const invoices = LocalStore.getInvoices();
    const updatedInvoices = invoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            zatca_status: result.status,
            qr_code_data: result.qrBase64,
            invoice_hash: result.invoiceHash,
            ubl_xml: result.xmlPayload,
            zatca_uuid: result.submissionId,
            updated_at: new Date().toISOString(),
          }
        : inv,
    );
    LocalStore.saveInvoices(updatedInvoices);

    // Audit Logging
    await AuditService.log({
      action: "ZATCA_SUBMIT",
      entity_type: "zatca",
      entity_id: invoiceId,
      metadata: {
        submission_uuid: result.submissionId,
        status: result.status,
        environment: result.environment,
        mode: result.mode,
        is_simulated: result.isSimulated,
        invoice_number: result.invoiceNumber,
      },
    });
  }
}
