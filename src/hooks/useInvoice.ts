import { useState, useEffect, useCallback } from "react";
import { InvoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/types/database";

interface UseInvoiceReturn {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads a single invoice by ID reactively.
 * Pass `null` as invoiceId to skip fetching.
 */
export function useInvoice(invoiceId: string | null): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await InvoiceService.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء جلب الفاتورة");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { invoice, loading, error, refresh: fetch };
}

// ─── useInvoices (list) ───────────────────────────────────────────────────────

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the full list of invoices reactively.
 */
export function useInvoices(): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InvoiceService.getInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء جلب الفواتير");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { invoices, loading, error, refresh: fetch };
}
