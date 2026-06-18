import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  /** Re-run the async function (e.g. after a mutation). */
  reload: () => void;
}

/**
 * Runs an async loader and tracks loading/error/data. Re-runs whenever a value
 * in `deps` changes. Designed to sit on top of the `/src/api` layer so every
 * screen gets real loading and error states for free.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    setError(undefined);
    run()
      .then((result) => {
        if (latest.current === ticket) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (latest.current === ticket) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setLoading(false);
        }
      });
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
