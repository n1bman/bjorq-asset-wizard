import { useState, useCallback, useEffect, useRef } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

/**
 * Generic hook for API calls with loading/error/data state.
 * Pass `immediate: true` (default) to fetch on mount.
 */
export function useApi<T>(
  apiFn: () => Promise<T>,
  opts?: { immediate?: boolean }
): UseApiReturn<T> {
  const immediate = opts?.immediate ?? true;
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: immediate, error: null });
  const fnRef = useRef(apiFn);
  fnRef.current = apiFn;

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, loading: false, error: null });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? "Unknown error" }));
    }
  }, []);

  useEffect(() => {
    if (immediate) { refetch(); }
  }, [immediate, refetch]);

  return { ...state, refetch };
}
