import { useState, useEffect, useCallback } from "react";
import { ServiceCatalog } from "@/services/serviceCatalog";
import type { ServiceItem } from "@/types/database";

interface UseServicesReturn {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Provides a reactive service-catalog list.
 */
export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ServiceCatalog.getServices();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء جلب الخدمات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { services, loading, error, refresh: fetch };
}
