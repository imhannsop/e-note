"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Shared feed state: loads through the server, refetches on realtime pings.
// Signed media URLs change on every fetch, so known ones are kept to avoid image reloads.
export function useFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urls = useRef(new Map<string, { url: string; at: number }>());

  const load = useCallback(async () => {
    try {
      const next = await getFeed();
      const now = Date.now();
      for (const p of next.posts)
        for (const m of p.media) {
          const known = urls.current.get(m.id);
          // Reuse for 50 min; the server signs links for 60
          if (known && now - known.at < 50 * 60_000) m.url = known.url;
          else urls.current.set(m.id, { url: m.url, at: now });
        }
      setFeed(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }, []);

  useEffect(() => {
    // Initial fetch from an effect is intentional: data lives behind server actions
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return subscribeChanges(load);
  }, [load]);

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
