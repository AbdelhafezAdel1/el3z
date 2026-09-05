import { useState, useEffect, useCallback } from "react";
import { CustomerService } from "@/services/customerService";
import type { Customer } from "@/types/database";

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Provides a reactive customer list.
 * Data is sourced from CustomerService (Supabase → localStorage fallback).
 */
export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CustomerService.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء جلب العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { customers, loading, error, refresh: fetch };
}
