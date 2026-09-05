import Big from "big.js";

// Configure Big.js precision settings
Big.DP = 4; // internal division precision
Big.RM = Big.roundHalfUp; // Standard accounting half-up rounding

export interface LineCalculationInput {
  quantity: number | string;
  unitPrice: number | string;
  discountRate?: number | string; // percentage 0-100
  vatRate?: number | string; // percentage, e.g. 15
}

export interface LineCalculationResult {
  grossAmount: number; // qty * price
  discountAmount: number; // gross * (discountRate / 100)
  taxableAmount: number; // gross - discount
  vatAmount: number; // taxable * (vatRate / 100)
  lineTotal: number; // taxable + vat
}

export interface InvoiceCalculationSummary {
  subtotal: number; // sum of taxable amounts
  discountTotal: number; // sum of discounts
  taxableTotal: number; // taxable base
  vatTotal: number; // total VAT 15%
  grandTotal: number; // final payable
}

/**
 * Perform exact decimal calculation for a single invoice line
 */
export function calculateLineItem(
  input: LineCalculationInput,
): LineCalculationResult {
  try {
    const qty = new Big(input.quantity || 0);
    const price = new Big(input.unitPrice || 0);
    const discountRate = new Big(input.discountRate || 0);
    const vatRate = new Big(
      input.vatRate !== undefined && input.vatRate !== null
        ? input.vatRate
        : 15,
    );

    // 1. Gross = Quantity * UnitPrice
    const gross = qty.times(price);

    // 2. Discount = Gross * (DiscountRate / 100)
    let discount = new Big(0);
    if (discountRate.gt(0)) {
      discount = gross.times(discountRate.div(100));
    }

    // 3. Taxable = Gross - Discount
    const taxable = gross.minus(discount);

    // 4. VAT = Taxable * (VatRate / 100)
    const vat = taxable.times(vatRate.div(100));

    // 5. Line Total = Taxable + VAT
    const total = taxable.plus(vat);

    return {
      grossAmount: Number(gross.toFixed(2)),
      discountAmount: Number(discount.toFixed(2)),
      taxableAmount: Number(taxable.toFixed(2)),
      vatAmount: Number(vat.toFixed(2)),
      lineTotal: Number(total.toFixed(2)),
    };
  } catch (error) {
    console.error("Calculation error in line item:", error);
    return {
      grossAmount: 0,
      discountAmount: 0,
      taxableAmount: 0,
      vatAmount: 0,
      lineTotal: 0,
    };
  }
}

/**
 * Recalculate full invoice totals from an array of line item calculations
 */
export function calculateInvoiceTotals(
  lines: LineCalculationResult[],
): InvoiceCalculationSummary {
  let subtotal = new Big(0);
  let discountTotal = new Big(0);
  let taxableTotal = new Big(0);
  let vatTotal = new Big(0);
  let grandTotal = new Big(0);

  for (const line of lines) {
    subtotal = subtotal.plus(line.grossAmount || 0);
    discountTotal = discountTotal.plus(line.discountAmount || 0);
    taxableTotal = taxableTotal.plus(line.taxableAmount || 0);
    vatTotal = vatTotal.plus(line.vatAmount || 0);
    grandTotal = grandTotal.plus(line.lineTotal || 0);
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    taxableTotal: Number(taxableTotal.toFixed(2)),
    vatTotal: Number(vatTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

/**
 * Format currency in Saudi Riyals (SAR / ر.س)
 */
export function formatSAR(
  amount: number | string | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return locale === "ar" ? "0.00 ر.س" : "SAR 0.00";
  }

  const num = Number(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return locale === "ar" ? `${formatted} ر.س` : `SAR ${formatted}`;
}

/**
 * Validate Saudi 15-digit VAT number (Starts with 3, ends with 3, total 15 digits)
 */
export function validateSaudiVatNumber(vat: string): boolean {
  if (!vat) return false;
  const clean = vat.trim();
  const regex = /^3\d{13}3$/;
  return regex.test(clean);
}

/**
 * Validate Saudi Commercial Registration (CR) Number (10 digits)
 */
export function validateSaudiCrNumber(cr: string): boolean {
  if (!cr) return false;
  const clean = cr.trim();
  return /^\d{10}$/.test(clean);
}
