import { Invoice } from "../types/database";
import { InvoiceService } from "./invoiceService";
import { CompanyService } from "./companyService";
import { calculateLineItem, calculateInvoiceTotals } from "../lib/money";

export interface TaxFilterOptions {
  period?: string;
  startDate?: string;
  endDate?: string;
  invoiceType?: string;
  zatcaStatus?: string;
  searchTerm?: string;
}

export interface TaxReportSummary {
  period: string;
  startDate?: string;
  endDate?: string;
  totalTaxableSales: number;
  totalVatOutput: number;
  totalGrandSales: number;
  totalZeroRatedSales: number;
  totalExemptSales: number;
  invoiceCount: number;
  b2bCount: number;
  b2cCount: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  complianceRate: number;
  invoices: Invoice[];
}

export class TaxService {
  /**
   * Calculates comprehensive VAT report summary from live invoice data
   */
  static async getTaxSummary(filters?: TaxFilterOptions): Promise<TaxReportSummary> {
    const allInvoices = await InvoiceService.getInvoices();

    // Filter valid (non-cancelled / active) invoices based on criteria
    const filtered = allInvoices.filter((inv) => {
      // Exclude cancelled invoices from standard tax liabilities
      if (inv.status === "cancelled") return false;

      // 1. Search filter
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matchesInvNum = inv.invoice_number.toLowerCase().includes(term);
        const matchesCustName =
          inv.customer?.name_ar?.toLowerCase().includes(term) ||
          inv.customer?.company_name?.toLowerCase().includes(term) ||
          inv.customer?.name_en?.toLowerCase().includes(term);
        const matchesCustVat = inv.customer?.vat_number?.includes(term);

        if (!matchesInvNum && !matchesCustName && !matchesCustVat) {
          return false;
        }
      }

      // 2. Invoice Type filter
      if (filters?.invoiceType && filters.invoiceType !== "all") {
        if (inv.invoice_type !== filters.invoiceType) return false;
      }

      // 3. ZATCA Status filter
      if (filters?.zatcaStatus && filters.zatcaStatus !== "all") {
        if (inv.zatca_status !== filters.zatcaStatus) return false;
      }

      // 4. Date range filter
      if (filters?.startDate && inv.issue_date < filters.startDate) {
        return false;
      }
      if (filters?.endDate && inv.issue_date > filters.endDate) {
        return false;
      }

      // 5. Preset Period filter (e.g. '2026-Q3' or '2026-09')
      if (filters?.period && filters.period !== "all") {
        if (filters.period.includes("-Q")) {
          const [year, q] = filters.period.split("-Q");
          const month = parseInt(inv.issue_date.split("-")[1], 10);
          const invYear = inv.issue_date.split("-")[0];
          if (invYear !== year) return false;

          if (q === "1" && (month < 1 || month > 3)) return false;
          if (q === "2" && (month < 4 || month > 6)) return false;
          if (q === "3" && (month < 7 || month > 9)) return false;
          if (q === "4" && (month < 10 || month > 12)) return false;
        } else {
          if (!inv.issue_date.startsWith(filters.period)) return false;
        }
      }

      return true;
    });

    let totalTaxableSales = 0;
    let totalVatOutput = 0;
    let totalGrandSales = 0;
    let totalZeroRatedSales = 0;
    let totalExemptSales = 0;

    let b2bCount = 0;
    let b2cCount = 0;
    let acceptedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    filtered.forEach((inv) => {
      const taxable = inv.taxable_amount || inv.subtotal || 0;
      const vat = inv.vat_amount || 0;
      const grand = inv.grand_total || 0;

      totalTaxableSales += taxable;
      totalVatOutput += vat;
      totalGrandSales += grand;

      if (inv.invoice_type === "tax_invoice") {
        b2bCount++;
      } else {
        b2cCount++;
      }

      if (inv.zatca_status === "accepted") {
        acceptedCount++;
      } else if (inv.zatca_status === "rejected" || inv.zatca_status === "error") {
        rejectedCount++;
      } else {
        pendingCount++;
      }

      // Check item-level tax exemptions
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((it) => {
          if (it.vat_rate === 0) {
            totalZeroRatedSales += it.taxable_amount || 0;
          }
        });
      }
    });

    const complianceRate =
      filtered.length > 0
        ? Math.round((acceptedCount / filtered.length) * 100)
        : 100;

    return {
      period: filters?.period || "كافة الفترات",
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      totalTaxableSales: Number(totalTaxableSales.toFixed(2)),
      totalVatOutput: Number(totalVatOutput.toFixed(2)),
      totalGrandSales: Number(totalGrandSales.toFixed(2)),
      totalZeroRatedSales: Number(totalZeroRatedSales.toFixed(2)),
      totalExemptSales: Number(totalExemptSales.toFixed(2)),
      invoiceCount: filtered.length,
      b2bCount,
      b2cCount,
      acceptedCount,
      pendingCount,
      rejectedCount,
      complianceRate,
      invoices: filtered,
    };
  }

  /**
   * Generates a standard ZATCA-compliant CSV string with UTF-8 BOM
   */
  static generateTaxCSV(summary: TaxReportSummary): string {
    const headers = [
      "رقم الفاتورة (Invoice Number)",
      "نوع الفاتورة (Type)",
      "تاريخ الإصدار (Issue Date)",
      "تاريخ التوريد (Supply Date)",
      "اسم العميل (Customer Name)",
      "الرقم الضريبي للعميل (Customer VAT)",
      "السجل التجاري (Customer CR)",
      "المبلغ الخاضع للضريبة (Taxable Base SAR)",
      "نسبة الضريبة (VAT Rate)",
      "مبلغ ضريبة القيمة المضافة (VAT Amount SAR)",
      "المجموع الكلي (Grand Total SAR)",
      "حالة هيئة الزكاة (ZATCA Status)",
      "طريقة السداد (Payment Method)",
    ];

    const rows = summary.invoices.map((inv) => [
      `"${inv.invoice_number}"`,
      `"${inv.invoice_type === "simplified_tax_invoice" ? "مبسطة (B2C)" : "ضريبية (B2B)"}"`,
      `"${inv.issue_date}"`,
      `"${inv.supply_date || inv.issue_date}"`,
      `"${inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}"`,
      `"${inv.customer?.vat_number || "-"}"`,
      `"${inv.customer?.cr_number || "-"}"`,
      (inv.taxable_amount || inv.subtotal || 0).toFixed(2),
      "15%",
      (inv.vat_amount || 0).toFixed(2),
      (inv.grand_total || 0).toFixed(2),
      `"${inv.zatca_status}"`,
      `"${inv.payment_method || "bank_transfer"}"`,
    ]);

    // Summary totals row
    const totalsRow = [
      `"الإجمالي الكلي للفترة"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"عدد الفواتير: ${summary.invoiceCount}"`,
      `"-"`,
      `"-"`,
      summary.totalTaxableSales.toFixed(2),
      `"-"`,
      summary.totalVatOutput.toFixed(2),
      summary.totalGrandSales.toFixed(2),
      `"نسبة الامتثال: ${summary.complianceRate}%"`,
      `"-"`,
    ];

    return (
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(",")), totalsRow.join(",")].join("\n")
    );
  }
}
