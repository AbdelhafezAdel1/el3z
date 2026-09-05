import { useState, useEffect, useCallback } from "react";

/**
 * Syncs a state value to/from localStorage.
 * Handles JSON serialisation and deserialisation automatically.
 * Falls back gracefully if localStorage is unavailable.
 *
 * @param key          - localStorage key
 * @param initialValue - Default value when the key is absent
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore quota errors silently
        }
        return next;
      });
    },
    [key],
  );

  /** Remove the key from localStorage and reset to initialValue */
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  // Sync across tabs via the storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const next =
            e.newValue !== null
              ? (JSON.parse(e.newValue) as T)
              : initialValue;
          setStoredValue(next);
        } catch {
          // ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
