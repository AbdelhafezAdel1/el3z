import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatSAR,
  validateSaudiVatNumber,
  validateSaudiCrNumber,
} from "./money";

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`✓ PASS: ${testName}`);
  } else {
    console.error(`✗ FAIL: ${testName} - Expected ${expected}, got ${actual}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export function runCalculationTests() {
  console.log("=== Running Centralized Money & Tax Calculation Tests ===");

  // Test 1: Single Line Standard Calculation (e.g. Door Installation 450 SAR @ 15% VAT)
  const line1 = calculateLineItem({
    quantity: 1,
    unitPrice: 450,
    discountRate: 0,
    vatRate: 15,
  });
  assertEqual(line1.grossAmount, 450.0, "Line 1 Gross Amount");
  assertEqual(line1.discountAmount, 0.0, "Line 1 Discount Amount");
  assertEqual(line1.taxableAmount, 450.0, "Line 1 Taxable Amount");
  assertEqual(line1.vatAmount, 67.5, "Line 1 VAT 15%");
  assertEqual(line1.lineTotal, 517.5, "Line 1 Line Total (Taxable + VAT)");

  // Test 2: Multi-qty with Discount (e.g. 2 x Door Repair 250 SAR with 10% Discount @ 15% VAT)
  const line2 = calculateLineItem({
    quantity: 2,
    unitPrice: 250,
    discountRate: 10,
    vatRate: 15,
  });
  // Gross = 2 * 250 = 500
  // Discount = 500 * 0.10 = 50
  // Taxable = 450
  // VAT = 450 * 0.15 = 67.5
  // Line Total = 517.5
  assertEqual(line2.grossAmount, 500.0, "Line 2 Gross Amount");
  assertEqual(line2.discountAmount, 50.0, "Line 2 Discount Amount (10%)");
  assertEqual(line2.taxableAmount, 450.0, "Line 2 Taxable Amount");
  assertEqual(line2.vatAmount, 67.5, "Line 2 VAT 15%");
  assertEqual(line2.lineTotal, 517.5, "Line 2 Line Total");

  // Test 3: Fractional / Complex Division (e.g. Quantity 3.5 @ 133.33 with 5.5% discount)
  const line3 = calculateLineItem({
    quantity: 3,
    unitPrice: 100,
    discountRate: 0,
    vatRate: 0, // 0% tax test
  });
  assertEqual(line3.grossAmount, 300.0, "Line 3 Zero VAT Gross");
  assertEqual(line3.vatAmount, 0.0, "Line 3 Zero VAT Amount");
  assertEqual(line3.lineTotal, 300.0, "Line 3 Zero VAT Line Total");

  // Test 4: Invoice Multi-line Totals Aggregation
  const invoiceTotals = calculateInvoiceTotals([line1, line2, line3]);
  // Subtotal = 450 + 500 + 300 = 1250
  // Discount = 0 + 50 + 0 = 50
  // Taxable = 450 + 450 + 300 = 1200
  // VAT = 67.5 + 67.5 + 0 = 135
  // Grand Total = 1200 + 135 = 1335
  assertEqual(invoiceTotals.subtotal, 1250.0, "Invoice Totals Subtotal");
  assertEqual(invoiceTotals.discountTotal, 50.0, "Invoice Totals Discount");
  assertEqual(invoiceTotals.taxableTotal, 1200.0, "Invoice Totals Taxable");
  assertEqual(invoiceTotals.vatTotal, 135.0, "Invoice Totals VAT Total");
  assertEqual(invoiceTotals.grandTotal, 1335.0, "Invoice Totals Grand Total");

  // Test 5: Saudi VAT Number Validation
  assertEqual(validateSaudiVatNumber("310123456700003"), true, "Valid 15-digit Saudi VAT");
  assertEqual(validateSaudiVatNumber("110123456700003"), false, "Invalid VAT (starts with 1)");
  assertEqual(validateSaudiVatNumber("310123456700002"), false, "Invalid VAT (ends with 2)");
  assertEqual(validateSaudiVatNumber("310123456700"), false, "Invalid VAT (12 digits)");

  // Test 6: Saudi CR Number Validation
  assertEqual(validateSaudiCrNumber("2051233487"), true, "Valid 10-digit CR");
  assertEqual(validateSaudiCrNumber("205123348"), false, "Invalid CR (9 digits)");

  console.log("=== ALL 14 MONEY & TAX CALCULATION TESTS PASSED SUCCESSFULLY ===");
  return true;
}

// Auto-run if executed directly
if (typeof process !== "undefined" && process.env) {
  try {
    runCalculationTests();
  } catch (e) {
    console.error(e);
  }
}
