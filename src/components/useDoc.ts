"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getDoc, saveDoc } from "@/app/actions";
import { track } from "@/components/loading";

type Kind = "devlog" | "planner";

const docs = new Map<Kind, unknown>();

export function seedDoc(kind: Kind, value: unknown) {
  if (value !== null) docs.set(kind, value);
}

export function clearDocs() {
  docs.clear();
}

export function useDoc<T>(
  kind: Kind,
  legacyKey: string,
  fallback: T,
  migrate: (raw: T) => T = (raw) => raw,
): [T, Dispatch<SetStateAction<T>>, { ready: boolean; error: string | null }] {
  const [value, setValue] = useState<T>(() => {
    const known = docs.get(kind) as T | null | undefined;
    return known == null ? fallback : migrate(known);
  });
  const [ready, setReady] = useState(() => docs.has(kind));
  const [error, setError] = useState<string | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    if (docs.has(kind)) return;
    let alive = true;
    track(getDoc<T>(kind))
      .then((stored) => {
        if (!alive) return;
        let next = stored;
        if (next === null) {
          try {
            const local = localStorage.getItem(legacyKey);
            if (local) {
              next = JSON.parse(local) as T;
              skipSave.current = false; 
            }
          } catch {}
        }
        if (next !== null) setValue(migrate(next));
        if (next !== null) docs.set(kind, next);
        setReady(true);
      })
      .catch(
        (e) =>
          alive && setError(e instanceof Error ? e.message : "Could not load"),
      );
    return () => {
      alive = false;
    };
  }, [kind]);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    docs.set(kind, value);
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
