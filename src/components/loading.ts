"use client";

import { useSyncExternalStore } from "react";

let state = { pending: 0, finished: 0 };
const listeners = new Set<() => void>();

function set(next: typeof state) {
  state = next;
  listeners.forEach((l) => l());
}

export function track<T>(promise: Promise<T>): Promise<T> {
  set({ ...state, pending: state.pending + 1 });
  const settle = () =>
    set({ pending: state.pending - 1, finished: state.finished + 1 });
  promise.then(settle, settle);
  return promise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const idle = { pending: 0, finished: 0 };

export function useLoadState() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => idle,
  );
}
