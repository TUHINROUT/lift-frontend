import { useCallback, useEffect, useRef, useState } from "react";

// Runs `loader` now, every `intervalMs`, when the tab regains focus and when the
// browser comes back online. Never overlaps itself and never throws.
export const useAutoSync = (loader, intervalMs = 15000) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const busy = useRef(false);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      await loaderRef.current();
      setLastSync(new Date());
    } catch {
      /* loaders report their own errors */
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    sync();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, intervalMs);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [sync, intervalMs]);

  return { sync, syncing, lastSync };
};
