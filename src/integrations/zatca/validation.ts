import { Invoice } from "../../types/database";
import { ZatcaValidationResult, ZatcaIssue } from "./types";
import { validateSaudiVatNumber, validateSaudiCrNumber } from "../../lib/money";

/**
 * Validates an invoice against ZATCA Electronic Invoicing requirements (Phase 1 & Phase 2).
 */
export function validateInvoice(invoice: Invoice): ZatcaValidationResult {
  const errors: ZatcaIssue[] = [];
  const warnings: ZatcaIssue[] = [];

  const isSimplified =
    invoice.invoice_type === "simplified_tax_invoice" ||
    !invoice.customer?.vat_number;
  const invoiceType: "standard" | "simplified" = isSimplified
    ? "simplified"
    : "standard";

  // 1. Basic Invoice Info Validation
  if (!invoice.invoice_number || invoice.invoice_number.trim() === "") {
    errors.push({
      code: "BR-KSA-01",
      category: "general",
      field: "invoice_number",
      messageAr: "رقم الفاتورة مطلوب ولا يمكن أن يكون فارغاً",
      messageEn: "Invoice number is mandatory",
      severity: "error",
    });
  }

  if (!invoice.issue_date || invoice.issue_date.trim() === "") {
    errors.push({
      code: "BR-KSA-02",
      category: "general",
      field: "issue_date",
      messageAr: "تاريخ إصدار الفاتورة إلزامي",
      messageEn: "Invoice issue date is mandatory",
      severity: "error",
    });
  }

  // 2. Seller Details Validation
  const sellerVat = invoice.company?.vat_number || "";
  if (!sellerVat) {
    errors.push({
      code: "BR-KSA-03",
      category: "seller",
      field: "company.vat_number",
      messageAr: "الرقم الضريبي للمنشأة الموردة إلزامي",
      messageEn: "Seller VAT number is mandatory",
      severity: "error",
    });
  } else if (!validateSaudiVatNumber(sellerVat)) {
    errors.push({
      code: "BR-KSA-04",
      category: "seller",
      field: "company.vat_number",
      messageAr:
        "الرقم الضريبي للمنشأة غير متوافق مع هيئة الزكاة (يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3)",
      messageEn:
        "Seller VAT number is invalid (must be 15 digits starting and ending with 3)",
      severity: "error",
    });
  }

  const sellerCr = invoice.company?.cr_number || "";
  if (!sellerCr) {
    warnings.push({
      code: "BR-KSA-05",
      category: "cr",
      field: "company.cr_number",
      messageAr: "يفضل تسجيل رقم السجل التجاري للمنشأة الموردة",
      messageEn: "Seller Commercial Registration (CR) is recommended",
      severity: "warning",
    });
  } else if (!validateSaudiCrNumber(sellerCr)) {
    warnings.push({
      code: "BR-KSA-06",
      category: "cr",
      field: "company.cr_number",
      messageAr: "رقم السجل التجاري للمنشأة غير مكتمل (يجب أن يتكون من 10 أرقام)",
      messageEn: "Seller CR number should be 10 digits",
      severity: "warning",
    });
  }

  // 3. Buyer / Customer Validation
  if (invoiceType === "standard") {
    // B2B Standard Tax Invoice requires Buyer Name & Buyer VAT Number
    if (!invoice.customer?.name_ar && !invoice.customer?.name_en && !invoice.customer?.company_name) {
      errors.push({
        code: "BR-KSA-07",
        category: "buyer",
        field: "customer.name",
        messageAr: "اسم المنشأة المشترية إلزامي في الفاتورة الضريبية القياسية (B2B)",
        messageEn: "Buyer name is mandatory for Standard Tax Invoice",
        severity: "error",
      });
    }

    const buyerVat = invoice.customer?.vat_number || "";
    if (!buyerVat) {
      warnings.push({
        code: "BR-KSA-08",
        category: "buyer",
        field: "customer.vat_number",
        messageAr: "الفاتورة الضريبية القياسية (B2B) تتطلب الرقم الضريبي للمشتري",
        messageEn: "Buyer VAT number is required for Standard B2B invoices",
        severity: "warning",
      });
    } else if (!validateSaudiVatNumber(buyerVat)) {
      errors.push({
        code: "BR-KSA-09",
        category: "buyer",
        field: "customer.vat_number",
        messageAr: "الرقم الضريبي للمشتري غير متوافق (يجب أن يكون 15 رقماً يبدأ وينتهي بـ 3)",
        messageEn: "Buyer VAT number format is invalid",
        severity: "error",
      });
    }
  }

  // 4. Line Items Validation
  if (!invoice.items || invoice.items.length === 0) {
    errors.push({
      code: "BR-KSA-10",
      category: "line_item",
      field: "items",
      messageAr: "يجب أن تحتوي الفاتورة على بند خدمة/سلعة واحد على الأقل",
      messageEn: "Invoice must contain at least one line item",
      severity: "error",
    });
  } else {
    invoice.items.forEach((item, idx) => {
      const itemNum = idx + 1;
      if (!item.description_ar || item.description_ar.trim() === "") {
        errors.push({
          code: `BR-KSA-11-${itemNum}`,
          category: "line_item",
          field: `items[${idx}].description_ar`,
          messageAr: `البند رقم (${itemNum}): وصف الخدمة/السلعة مطلوب`,
          messageEn: `Item #${itemNum}: Item description is required`,
          severity: "error",
        });
      }

      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        errors.push({
          code: `BR-KSA-12-${itemNum}`,
          category: "line_item",
          field: `items[${idx}].quantity`,
          messageAr: `البند رقم (${itemNum}): الكمية يجب أن تكون أكبر من الصفر`,
          messageEn: `Item #${itemNum}: Quantity must be greater than zero`,
          severity: "error",
        });
      }

      if (typeof item.unit_price !== "number" || item.unit_price < 0) {
        errors.push({
          code: `BR-KSA-13-${itemNum}`,
          category: "line_item",
          field: `items[${idx}].unit_price`,
          messageAr: `البند رقم (${itemNum}): سعر الوحدة لا يمكن أن يكون سالباً`,
          messageEn: `Item #${itemNum}: Unit price cannot be negative`,
          severity: "error",
        });
      }
    });
  }

  // 5. Total Calculations & Monetary Sanity Checks
  if (typeof invoice.grand_total !== "number" || invoice.grand_total <= 0) {
    errors.push({
      code: "BR-KSA-14",
      category: "calculation",
      field: "grand_total",
      messageAr: "إجمالي الفاتورة النهائي شامل الضريبة يجب أن يكون أكبر من الصفر",
      messageEn: "Invoice grand total must be positive",
      severity: "error",
    });
  }

  // Mathematical consistency
  const taxable = invoice.taxable_amount || invoice.subtotal || 0;
  const vat = invoice.vat_amount || 0;
  const total = invoice.grand_total || 0;
  const computedTotal = taxable + vat;

  if (Math.abs(computedTotal - total) > 0.05) {
    warnings.push({
      code: "BR-KSA-15",
      category: "calculation",
      field: "grand_total",
      messageAr: `يوجد فارق في الحساب الرياضي بين مجموع الخاضع والضريبة (${computedTotal.toFixed(2)}) والإجمالي (${total.toFixed(2)})`,
      messageEn: "Sum of taxable amount and VAT deviates from grand total",
      severity: "warning",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAt: new Date().toISOString(),
    invoiceType,
  };
}
