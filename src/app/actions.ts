"use server";

import bcrypt from "bcryptjs";
import { BUCKET, db, ping } from "@/lib/server/supabase";
import {
  createSession,
  deleteSession,
  requireProfile,
} from "@/lib/server/session";
import { PROFILE_IDS, type ProfileId } from "@/lib/profiles";
import type {
  Feed,
  FeedMedia,
  MediaKind,
  ProfileMeta,
  UploadSlot,
} from "@/lib/types";

// Server actions only.

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;
const URL_TTL = 60 * 60; // signed media links last an hour

function fail(message: string): never {
  throw new Error(message);
}

// Auth

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signIn(
  profileId: string,
  pin: string,
): Promise<SignInResult> {
  if (!PROFILE_IDS.includes(profileId as ProfileId))
    return { ok: false, error: "Unknown profile" };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Enter 4 digits" };

  const { data: p } = await db
    .from("profiles")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("id", profileId)
    .single();
  if (!p?.pin_hash)
    return { ok: false, error: "No PIN set for this profile yet" };

  if (p.locked_until && new Date(p.locked_until) > new Date()) {
    const mins = Math.ceil(
      (new Date(p.locked_until).getTime() - Date.now()) / 60_000,
    );
    return { ok: false, error: `Too many tries. Try again in ${mins} min.` };
  }

  if (!(await bcrypt.compare(pin, p.pin_hash))) {
    const tries = p.failed_attempts + 1;
    const locked = tries >= MAX_TRIES;
    await db
      .from("profiles")
      .update({
        failed_attempts: locked ? 0 : tries,
        locked_until: locked
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null,
      })
      .eq("id", profileId);
    return {
      ok: false,
      error: locked
        ? `Too many tries. Locked for ${LOCK_MINUTES} min.`
        : `Wrong PIN · ${MAX_TRIES - tries} left`,
    };
  }

  await db
    .from("profiles")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("id", profileId);
  await createSession(profileId as ProfileId);
  return { ok: true };
}

// PIN status.
export async function pinStatus(
  profileId: string,
): Promise<{ hasPin: boolean }> {
  if (!PROFILE_IDS.includes(profileId as ProfileId)) fail("Unknown profile");
  const { data } = await db
    .from("profiles")
    .select("pin_hash")
    .eq("id", profileId)
    .single();
  return { hasPin: Boolean(data?.pin_hash) };
}

// First-time PIN setup.
export async function createPin(
  profileId: string,
  pin: string,
): Promise<SignInResult> {
  if (!PROFILE_IDS.includes(profileId as ProfileId))
    return { ok: false, error: "Unknown profile" };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Enter 4 digits" };
  if (
    /^(\d)\1{3}$/.test(pin) ||
    ["1234", "4321", "0123", "9876"].includes(pin)
  ) {
    return { ok: false, error: "Too easy to guess. Pick another." };
  }

  // Guard against race conditions.
  const { data, error } = await db
    .from("profiles")
    .update({
      pin_hash: await bcrypt.hash(pin, 12),
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", profileId)
    .is("pin_hash", null)
    .select("id");
  if (error) return { ok: false, error: "Couldn't save the PIN" };
  if (!data?.length)
    return { ok: false, error: "This profile already has a PIN" };

  await createSession(profileId as ProfileId);
  return { ok: true };
}

export async function signOut() {
  await deleteSession();
}

// Profiles

export async function getProfileMeta(profileId: string): Promise<ProfileMeta> {
  await requireProfile();
  const { data } = await db
    .from("profiles")
    .select("display_name, bio")
    .eq("id", profileId)
    .single();
  return { name: data?.display_name ?? profileId, bio: data?.bio ?? "" };
}

export async function saveProfileMeta(meta: ProfileMeta) {
  const me = await requireProfile();
  const name = String(meta.name).trim().slice(0, 40) || me;
  const bio = String(meta.bio).slice(0, 80);
  await db.from("profiles").update({ display_name: name, bio }).eq("id", me);
}

// Feed

export async function getFeed(): Promise<Feed> {
  await requireProfile();
  const [posts, media, likes, comments] = await Promise.all([
    db
      .from("posts")
      .select("id, profile_id, body, tags, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("post_media")
      .select("id, post_id, kind, path, position")
      .order("position"),
    db.from("likes").select("post_id, profile_id, created_at"),
    db
      .from("comments")
      .select("id, post_id, profile_id, body, created_at")
      .order("created_at"),
  ]);
  if (posts.error) fail(posts.error.message);

  const postRows = posts.data ?? [];
  const ids = new Set(postRows.map((p) => p.id));
  const rows = (media.data ?? []).filter((m) => ids.has(m.post_id));
  const signed = rows.length
    ? ((
        await db.storage.from(BUCKET).createSignedUrls(
          rows.map((m) => m.path),
          URL_TTL,
        )
      ).data ?? [])
    : [];
  const urlOf = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const mediaOf = new Map<string, FeedMedia[]>();
  for (const m of rows) {
    const url = urlOf.get(m.path);
    if (!url) continue;
    const list = mediaOf.get(m.post_id) ?? [];
    list.push({ id: m.id, kind: m.kind as MediaKind, url });
    mediaOf.set(m.post_id, list);
  }

  return {
    posts: postRows.map((p) => ({
      id: p.id,
      profileId: p.profile_id,
      text: p.body,
      tags: p.tags ?? [],
      at: p.created_at,
      media: mediaOf.get(p.id) ?? [],
    })),
    likes: (likes.data ?? []).map((l) => ({
      postId: l.post_id,
      profileId: l.profile_id,
      at: l.created_at,
    })),
    comments: (comments.data ?? []).map((c) => ({
      id: c.id,
      postId: c.post_id,
      profileId: c.profile_id,
      text: c.body,
      at: c.created_at,
    })),
  };
}

// Media upload slots.
export async function createUploadSlots(
  files: { kind: MediaKind; ext: string }[],
): Promise<UploadSlot[]> {
  const me = await requireProfile();
  if (!Array.isArray(files) || files.length > 20) fail("Too many files");
  return Promise.all(
    files.map(async (f) => {
      if (f.kind !== "image" && f.kind !== "video") fail("Bad media kind");
      const ext =
        String(f.ext)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 5) || "bin";
      const path = `${me}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (error || !data) fail(error?.message ?? "Upload failed");
      return { path, token: data.token };
    }),
  );
}

export async function createPost(input: {
  text: string;
  tags: string[];
  media: { path: string; kind: MediaKind }[];
}) {
  const me = await requireProfile();
  const text = String(input.text ?? "").trim();
  if (!text || text.length > 2000) fail("Post text must be 1–2000 characters");
  const tags = (Array.isArray(input.tags) ? input.tags : [])
    .map(String)
    .slice(0, 10);
  const media = Array.isArray(input.media) ? input.media.slice(0, 20) : [];
  // Only allow files from this profile.
  if (
    media.some(
      (m) =>
        !String(m.path).startsWith(`${me}/`) ||
        (m.kind !== "image" && m.kind !== "video"),
    )
  ) {
    fail("Invalid media");
  }

  const { data: post, error } = await db
    .from("posts")
    .insert({ profile_id: me, body: text, tags })
    .select("id")
    .single();
  if (error || !post) fail(error?.message ?? "Could not post");

  if (media.length) {
    const { error: mErr } = await db.from("post_media").insert(
      media.map((m, i) => ({
        post_id: post.id,
        kind: m.kind,
        path: m.path,
        position: i,
      })),
    );
    if (mErr) fail(mErr.message);
  }
  await ping();
}

export async function deletePost(postId: string) {
  const me = await requireProfile();
  const { data: post } = await db
    .from("posts")
    .select("profile_id")
    .eq("id", postId)
    .single();
  if (!post || post.profile_id !== me) fail("Not your post");
  const { data: media } = await db
    .from("post_media")
    .select("path")
    .eq("post_id", postId);
  if (media?.length)
    await db.storage.from(BUCKET).remove(media.map((m) => m.path));
  await db.from("posts").delete().eq("id", postId);
  await ping();
}

export async function toggleLike(postId: string) {
  const me = await requireProfile();
  const { data: existing } = await db
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", me)
    .maybeSingle();
  if (existing)
    await db.from("likes").delete().eq("post_id", postId).eq("profile_id", me);
  else {
    const { error } = await db
      .from("likes")
      .insert({ post_id: postId, profile_id: me });
    if (error) fail(error.message);
  }
  await ping();
}

export async function addComment(postId: string, text: string) {
  const me = await requireProfile();
  const body = String(text ?? "").trim();
  if (!body || body.length > 500) fail("Comment must be 1–500 characters");
  const { error } = await db
    .from("comments")
    .insert({ post_id: postId, profile_id: me, body });
  if (error) fail(error.message);
  await ping();
}

export async function deleteComment(commentId: string) {
  const me = await requireProfile();
  await db.from("comments").delete().eq("id", commentId).eq("profile_id", me);
  await ping();
}

// ---------- Notifications ----------

export async function getNotifSeen(): Promise<string> {
  const me = await requireProfile();
  const { data } = await db
    .from("profiles")
    .select("notif_seen_at")
    .eq("id", me)
    .single();
  return data?.notif_seen_at ?? new Date(0).toISOString();
}

export async function markNotifsSeen(): Promise<string> {
  const me = await requireProfile();
  const now = new Date().toISOString();
  await db.from("profiles").update({ notif_seen_at: now }).eq("id", me);
  return now;
}

// ---------- Private documents (dev log, planner) ----------

type DocKind = "devlog" | "planner";

export async function getDoc<T>(kind: DocKind): Promise<T | null> {
  const me = await requireProfile();
  if (kind !== "devlog" && kind !== "planner") fail("Bad document");
  const { data } = await db
    .from("documents")
    .select("data")
    .eq("profile_id", me)
    .eq("kind", kind)
    .maybeSingle();
  return (data?.data as T) ?? null;
}

export async function saveDoc(kind: DocKind, data: unknown) {
  const me = await requireProfile();
  if (kind !== "devlog" && kind !== "planner") fail("Bad document");
  const json = JSON.stringify(data);
  if (json.length > 1_000_000) fail("Document too large");
  const { error } = await db.from("documents").upsert({
    profile_id: me,
    kind,
    data: JSON.parse(json),
    updated_at: new Date().toISOString(),
  });
  if (error) fail(error.message);
}
