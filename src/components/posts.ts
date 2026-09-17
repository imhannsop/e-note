"use client";

import { useSyncExternalStore } from "react";
import { createPost, createUploadSlots, getFeed } from "@/app/actions";
import { browserDb, subscribeChanges } from "@/lib/browser";
import type { Feed, FeedPost, MediaKind } from "@/lib/types";

export type { Comment, Feed, FeedPost as Post, Like } from "@/lib/types";

// #hashtags in a caption double as tags
export const tagsOf = (caption: string) =>
  [...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) ?? [])].map((t) =>
    t.toLowerCase(),
  );

const EMPTY: Feed = { posts: [], likes: [], comments: [] };

// Shared feed state: one cached copy for every screen, refetched on realtime pings.
// Signed media URLs change on every fetch, so known ones are kept to avoid image reloads.
let cached: Feed | null = null;
let lastError: string | null = null;
let inflight: Promise<void> | null = null;
let again = false;
let unsubscribe: (() => void) | null = null;
let pingTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const urls = new Map<string, { url: string; at: number }>();
const notify = () => listeners.forEach((l) => l());

function load(): Promise<void> {
  // Coalesce overlapping requests; run once more if asked mid-flight
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    try {
      const next = await getFeed();
      const now = Date.now();
      for (const p of next.posts)
        for (const m of p.media) {
          const known = urls.get(m.id);
          // Reuse for 50 min; the server signs links for 60
          if (known && now - known.at < 50 * 60_000) m.url = known.url;
          else urls.set(m.id, { url: m.url, at: now });
        }
      cached = next;
      lastError = null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Could not load";
    } finally {
      inflight = null;
      notify();
      if (again) {
        again = false;
        load();
      }
    }
  })();
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribe) {
    load();
    // Bursts of pings (e.g. several likes) collapse into one refetch
    unsubscribe = subscribeChanges(() => {
      clearTimeout(pingTimer);
      pingTimer = setTimeout(load, 250);
    });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}

export function useFeed() {
  const feed = useSyncExternalStore(
    subscribe,
    () => cached,
    () => null,
  );
  const error = useSyncExternalStore(
    subscribe,
    () => lastError,
    () => null,
  );
  return { feed: feed ?? EMPTY, loading: feed === null, error, reload: load };
}

export const likesFor = (feed: Feed, postId: string) =>
  feed.likes.filter((l) => l.postId === postId);
export const commentsFor = (feed: Feed, postId: string) =>
  feed.comments.filter((c) => c.postId === postId);

// Uploads files straight to storage, then creates the post
export async function publishPost(
  text: string,
  tags: string[],
  files: { file: File; kind: MediaKind }[],
) {
  const slots = files.length
    ? await createUploadSlots(
        files.map((f) => ({
          kind: f.kind,
          ext: f.file.name.split(".").pop() ?? "",
        })),
      )
    : [];
  await Promise.all(
    slots.map(async (s, i) => {
      const { error } = await browserDb()
        .storage.from("media")
        .uploadToSignedUrl(s.path, s.token, files[i].file, {
          contentType: files[i].file.type,
        });
      if (error) throw error;
    }),
  );
  await createPost({
    text,
    tags,
    media: slots.map((s, i) => ({ path: s.path, kind: files[i].kind })),
  });
}

export type { FeedPost };
