"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { clear, createStore, get, set } from "idb-keyval";
import { getDoc, saveDoc } from "@/app/actions";
import { track } from "@/components/loading";

type Kind = "devlog" | "planner";

// dirty = edited locally but not yet confirmed saved on the server
type Cached = { value: unknown; dirty: boolean };

const docs = new Map<Kind, unknown>();

let store: ReturnType<typeof createStore> | null = null;
function idb() {
  store ??= createStore("ink", "docs");
  return store;
}

function readCache(kind: Kind) {
  return get<Cached>(kind, idb()).catch(() => undefined);
}

function writeCache(kind: Kind, value: unknown, dirty: boolean) {
  set(kind, { value, dirty } satisfies Cached, idb()).catch(() => {});
}

export function seedDoc(kind: Kind, value: unknown) {
  if (value !== null) docs.set(kind, value);
}

export function clearDocs() {
  docs.clear();
  clear(idb()).catch(() => {});
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
    let alive = true;
    if (docs.has(kind)) {
      // seeded at startup; still restore edits that never reached the server
      readCache(kind).then((cached) => {
        if (!alive) return;
        if (cached?.dirty) {
          skipSave.current = false;
          docs.set(kind, cached.value);
          setValue(migrate(cached.value as T));
        } else writeCache(kind, docs.get(kind), false);
      });
      return () => {
        alive = false;
      };
    }
    Promise.all([readCache(kind), track(getDoc<T>(kind)).catch((e) => e as Error)])
      .then(([cached, stored]) => {
        if (!alive) return;
        let next: T | null;
        if (cached?.dirty) {
          // unsynced local edits win; the save effect pushes them up
          next = cached.value as T;
          skipSave.current = false;
        } else if (stored instanceof Error) {
          if (!cached) throw stored;
          next = cached.value as T; // offline: show last known copy
          setError("Offline, showing saved copy");
        } else {
          next = stored;
          if (next !== null) writeCache(kind, next, false);
        }
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
    writeCache(kind, value, true);
    const t = setTimeout(() => {
      saveDoc(kind, value).then(
        () => {
          setError(null);
          writeCache(kind, value, false);
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
