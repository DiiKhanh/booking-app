import { useCallback, useRef, useState } from "react";
import { CONFIG } from "@/constants/config";
import { isConflictError } from "@/utils/error";

interface ConflictRetryState {
  readonly isRetrying: boolean;
  readonly retryCount: number;
  readonly showConflictModal: boolean;
}

interface ConflictRetryActions {
  executeWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
  dismissConflict: () => void;
  reset: () => void;
}

export function useConflictRetry(): ConflictRetryState & ConflictRetryActions {
  const [state, setState] = useState<ConflictRetryState>({
    isRetrying: false,
    retryCount: 0,
    showConflictModal: false,
  });

  const retryCountRef = useRef(0);

  const executeWithRetry = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setState((prev) => ({ ...prev, isRetrying: true }));

      try {
        const result = await fn();
        setState({ isRetrying: false, retryCount: 0, showConflictModal: false });
        retryCountRef.current = 0;
        return result;
      } catch (error) {
        if (
          isConflictError(error) &&
          retryCountRef.current < CONFIG.CONFLICT_RETRY_MAX
        ) {
          retryCountRef.current += 1;
          const delay =
            CONFIG.CONFLICT_RETRY_BASE_MS *
            Math.pow(2, retryCountRef.current - 1);

          setState((prev) => ({
            ...prev,
            retryCount: retryCountRef.current,
          }));

          await new Promise((resolve) => setTimeout(resolve, delay));
          return executeWithRetry(fn);
        }

        setState({
          isRetrying: false,
          retryCount: retryCountRef.current,
          showConflictModal: isConflictError(error),
        });
        throw error;
      }
    },
    [],
  );

  const dismissConflict = useCallback(() => {
    setState((prev) => ({ ...prev, showConflictModal: false }));
  }, []);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    setState({ isRetrying: false, retryCount: 0, showConflictModal: false });
  }, []);

  return { ...state, executeWithRetry, dismissConflict, reset };
}
