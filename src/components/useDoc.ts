"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getDoc, saveDoc } from "@/app/actions";

type Kind = "devlog" | "planner";

// Server-backed profile document.
export function useDoc<T>(
  kind: Kind,
  legacyKey: string,
  fallback: T,
  migrate: (raw: T) => T = (raw) => raw,
): [T, Dispatch<SetStateAction<T>>, { ready: boolean; error: string | null }] {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    let alive = true;
    getDoc<T>(kind)
      .then((stored) => {
        if (!alive) return;
        let next = stored;
        if (next === null) {
          try {
            const local = localStorage.getItem(legacyKey);
            if (local) {
              next = JSON.parse(local) as T;
              skipSave.current = false; // push the local copy up
            }
          } catch {}
        }
        if (next !== null) setValue(migrate(next));
        setReady(true);
      })
      .catch(
        (e) =>
          alive && setError(e instanceof Error ? e.message : "Could not load"),
      );
    return () => {
      alive = false;
    };
    // Loaded once per document; migrate and legacyKey are stable per caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveDoc(kind, value).then(
        () => {
          setError(null);
          try {
            localStorage.removeItem(legacyKey);
          } catch {}
        },
        (e) => setError(e instanceof Error ? e.message : "Could not save"),
      );
    }, 600);
    return () => clearTimeout(t);
  }, [kind, legacyKey, value, ready]);

  return [value, setValue, { ready, error }];
}
