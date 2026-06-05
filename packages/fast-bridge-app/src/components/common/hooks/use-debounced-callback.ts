import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStableCallback } from "./use-stable-callback";

type AnyFn = (...args: never[]) => unknown;

export interface Debounced<T extends AnyFn> {
  cancel: () => void;
  flush: () => void;
  (...args: Parameters<T>): void;
}

/**
 * Returns a debounced function that delays invoking `fn` until after `delay`
 * milliseconds have elapsed since the last call.
 */
export function useDebouncedCallback<T extends AnyFn>(
  fn: T,
  delay: number
): Debounced<T> {
  const latest = useStableCallback(fn);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current && lastArgsRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const latestArgs = lastArgsRef.current;
      latest(...latestArgs);
      lastArgsRef.current = null;
    }
  }, [latest]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    const debounced = ((...args: Parameters<T>) => {
      lastArgsRef.current = args;
      cancel();
      timerRef.current = setTimeout(() => {
        const latestArgs = lastArgsRef.current;
        if (!latestArgs) {
          return;
        }
        latest(...latestArgs);
        lastArgsRef.current = null;
        timerRef.current = null;
      }, delay);
    }) as Debounced<T>;
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }, [cancel, delay, flush, latest]);
}
