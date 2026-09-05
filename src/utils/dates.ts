/**
 * Date formatting utilities
 * All dates are formatted in the Saudi locale (ar-SA) by default,
 * with a fallback to en-US for English users.
 */

/** Format a date as a short localised string: e.g. "٢ سبتمبر ٢٠٢٦" */
export function formatDate(
  date: string | Date | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format a date as a compact numeric string: "2026/09/02" */
export function formatDateShort(
  date: string | Date | null | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Returns an ISO date string (YYYY-MM-DD) for today */
export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

/** Add N days to a date and return ISO string */
export function addDays(date: string | Date, days: number): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Parse an ISO date string to a JS Date (UTC-safe) */
export function parseIso(iso: string): Date {
  // Append T00:00:00 to avoid timezone shift when parsing date-only strings
  return new Date(`${iso}T00:00:00`);
}

/** Returns true if the date is today or in the past */
export function isOverdue(dueDate: string | Date): boolean {
  const d = typeof dueDate === "string" ? parseIso(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
