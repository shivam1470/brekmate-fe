import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type DependencyList,
} from "react";
export function useQuery<T>(load: () => Promise<T>, deps: DependencyList = []) {
  const key = useMemo(() => ({}), deps);
  const [state, setState] = useState<{
    key: object;
    data?: T;
    error: string;
    loading: boolean;
  }>({ key, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState((old) => ({
      key,
      data: old.key === key ? old.data : undefined,
      error: "",
      loading: true,
    }));
    load().then(
      (data) => {
        if (active) setState({ key, data, error: "", loading: false });
      },
      (e) => {
        if (active)
          setState((old) => ({
            ...old,
            error: e instanceof Error ? e.message : "Unable to load.",
            loading: false,
          }));
      },
    );
    return () => {
      active = false;
    };
  }, [key, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  return {
    ...(state.key === key
      ? state
      : { data: undefined, error: "", loading: true }),
    reload,
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = useRef(false);
  return {
    busy,
    error,
    notice,
    clear: () => {
      setError("");
      setNotice("");
    },
    async run<T>(fn: () => Promise<T>, done?: (r: T) => void) {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const result = await fn();
        done?.(result);
        setNotice("Saved.");
        return result;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to complete. Please retry.",
        );
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
  };
}
