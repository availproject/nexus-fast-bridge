import { useEffect, useState } from "react";
import { useDebouncedCallback } from "./use-debounced-callback";

/**
 * Derives a debounced value from an input value and delay.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  const setter = useDebouncedCallback((v: T) => setDebounced(v), delay);

  useEffect(() => {
    setter(value);
    return setter.cancel;
  }, [setter, value]);

  return debounced;
}
