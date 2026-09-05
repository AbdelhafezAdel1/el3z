import { useState, useEffect, useCallback } from "react";

/**
 * Debounces a rapidly-changing value.
 * Useful for search inputs to avoid firing on every keystroke.
 *
 * @param value   - The value to debounce
 * @param delay   - Delay in milliseconds (default 300 ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounces a callback function.
 * Useful for debouncing event handlers like onInput.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  return useCallback(
    (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      setTimer(setTimeout(() => fn(...args), delay));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay],
  );
}
