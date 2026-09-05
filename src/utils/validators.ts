/**
 * Lightweight validation helpers (pure functions, no Zod dependency).
 * Full Zod schemas live in src/validation/*.ts.
 */

/** Validate a Saudi 15-digit VAT number (TIN). Format: 3xxxxxxxxxxxxxxxxx */
export function isValidSaudiVatNumber(vat: string): boolean {
  return /^3\d{14}$/.test(vat.trim());
}

/** Validate a Saudi Commercial Registration number (10 digits) */
export function isValidSaudiCrNumber(cr: string): boolean {
  return /^\d{10}$/.test(cr.trim());
}

/** Validate a Saudi national ID (10 digits, starts with 1 or 2) */
export function isValidSaudiNationalId(id: string): boolean {
  return /^[12]\d{9}$/.test(id.trim());
}

/** Basic email format check */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Saudi mobile number: +966 or 05xxxxxxxx */
export function isValidSaudiPhone(phone: string): boolean {
  const normalized = phone.replace(/\s|-/g, "");
  return /^(\+9665|05)\d{8}$/.test(normalized);
}

/** Check that a string is a non-empty, non-whitespace value */
export function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Return true if value is a valid ISO date string (YYYY-MM-DD) */
export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}
