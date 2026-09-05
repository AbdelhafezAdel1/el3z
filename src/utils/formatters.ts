/**
 * General string / number formatters used throughout the app.
 * Monetary formatting is in src/lib/money.ts (uses Big.js).
 */

/** Truncate a string to maxLen characters, appending "..." if truncated */
export function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

/** Capitalize the first letter of a string */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format a number with thousands separators */
export function formatNumber(
  value: number,
): string {
  return value.toLocaleString("en-US");
}

/** Format a percentage, e.g. 15 → "15%" */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/** Pad invoice number to a fixed length, e.g. 42 → "INV-0042" */
export function formatInvoiceNumber(num: number, prefix = "INV", pad = 4): string {
  return `${prefix}-${String(num).padStart(pad, "0")}`;
}

/** Convert bytes to a human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strip all non-digit characters from a string */
export function digitsOnly(str: string): string {
  return str.replace(/\D/g, "");
}

/** Convert a camelCase or snake_case key to a human-readable label */
export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
}
