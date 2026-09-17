"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deletePhoto, listPhotos, tagsOf } from "@/components/photos";
import PhotoViewer, { type Shown } from "@/components/PhotoViewer";
import { Avatar, type Profile } from "@/components/profiles";
import { Icon } from "@/components/ui";

const PAGE = 24;

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  play: "M8 5v14l11-7z",
};

type Meta = { name: string; bio: string };

function loadMeta(key: string, fallback: Meta): Meta {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    return fallback;
  }
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function Gallery({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const metaKey = `ink:profile:${profile.id}`;
  const [meta, setMeta] = useState<Meta>(() => loadMeta(metaKey, { name: profile.name, bio: "" }));
  const [editing, setEditing] = useState(false);
  const [photos, setPhotos] = useState<Shown[] | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [newest, setNewest] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  const urls = useRef<string[]>([]);

  // Load once; blob URLs are freed when the gallery closes
  useEffect(() => {
    let alive = true;
    listPhotos(profile.id)
      .catch(() => [])
      .then((rows) => {
        if (!alive) return;
        const shown = rows.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) }));
        urls.current.push(...shown.map((p) => p.url));
        setPhotos(shown);
      });
    return () => {
      alive = false;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, [profile.id]);

  useEffect(() => {
    try {
      localStorage.setItem(metaKey, JSON.stringify(meta));
    } catch {}
  }, [metaKey, meta]);

  const tags = useMemo(() => [...new Set((photos ?? []).flatMap((p) => tagsOf(p.caption)))].sort(), [photos]);

  const visible = useMemo(() => {
    return (photos ?? [])
      .filter((p) => !tag || tagsOf(p.caption).includes(tag))
      .sort((a, b) => (newest ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));
  }, [photos, tag, newest]);

  const page = visible.slice(0, limit);

  async function remove(id: string) {
    await deletePhoto(id).catch(() => {});
    setPhotos((ps) => (ps ?? []).filter((p) => p.id !== id));
    setOpen((i) => (i === null || visible.length <= 1 ? null : Math.min(i, visible.length - 2)));
  }

  return (
    <section
      className="gallery fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Top navigation */}
      <header className="enter sticky top-0 z-20 mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15 bg-[var(--paper)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">Gallery</span>
        <span className="size-10" aria-hidden />
      </header>

      {/* Profile, slightly recessed */}
      <div
        className="enter mx-4 mt-4 flex items-center gap-4 rounded-3xl border border-foreground/15 p-4 shadow-[inset_0_2px_6px_color-mix(in_srgb,var(--ink)_12%,transparent)]"
        style={{ animationDelay: "60ms" }}
      >
        <Avatar profile={profile} className="size-20 rounded-full text-3xl" />
        {editing ? (
          <form
            className="flex min-w-0 flex-1 flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              aria-label="Name"
              className="border-b border-[var(--ink)] bg-transparent text-2xl font-semibold outline-none"
            />
            <input
              value={meta.bio}
              onChange={(e) => setMeta((m) => ({ ...m, bio: e.target.value }))}
              placeholder="A line about you"
              aria-label="Bio"
              maxLength={80}
              className="border-b border-foreground/30 bg-transparent text-sm outline-none placeholder:text-[var(--gray)]"
            />
            <button type="submit" className="ink-solid h-8 self-start rounded-full px-4 text-xs font-semibold">
              Done
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
          >
            <span className="text-4xl leading-[0.95] font-semibold tracking-tighter break-words">
              {meta.name.trim() || profile.name}
            </span>
            <span className="truncate text-sm text-[var(--gray)]">{meta.bio || "Tap to add a bio"}</span>
            <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase tabular-nums">
              {photos?.length ?? 0} photos
            </span>
          </button>
        )}
      </div>

      {/* Sort, tags */}
      <div className="enter mx-4 mt-4 flex flex-col gap-2 border-b border-foreground/15 pb-3" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase tabular-nums">
            {visible.length} shown
          </span>
          <button
            type="button"
            onClick={() => setNewest((n) => !n)}
            aria-label={`Sort by ${newest ? "newest" : "oldest"} first, tap to switch`}
            className="ink-solid flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs transition-transform duration-200 active:scale-[0.97]"
          >
            <span className="opacity-60">Sort by:</span>
            <span className="font-semibold">{newest ? "Newest" : "Oldest"}</span>
            <span aria-hidden>{newest ? "↓" : "↑"}</span>
          </button>
        </div>
        {tags.length > 0 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
            {[null, ...tags].map((t) => (
              <button
                key={t ?? "all"}
                type="button"
                onClick={() => {
                  setTag(t);
                  setLimit(PAGE);
                }}
                className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors duration-200 ${
                  tag === t
                    ? "ink-solid"
                    : "border border-foreground/20 text-[var(--gray)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {t ?? "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The grid: bordered square cards on an even gutter */}
      <div className="enter mt-4 flex-1 px-4" style={{ animationDelay: "180ms" }}>
        {photos !== null && (
          <ul className="grid grid-cols-3 gap-3">
            {page.map((p, i) => (
              <li key={p.id} className="flex min-w-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`Open ${p.caption || "photo"} from ${fmtDate(p.at)}`}
                  className="group relative block aspect-square w-full overflow-hidden border border-[var(--ink)] bg-[var(--paper)] outline-none transition-colors duration-150 hover:border-[var(--accent)] focus-visible:border-[var(--accent)] active:border-[var(--accent)]"
                >
                  {p.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob
                    <img src={p.url} alt="" loading="lazy" className="size-full object-cover grayscale contrast-125" />
                  ) : (
                    <video src={p.url} muted playsInline preload="metadata" className="size-full object-cover grayscale contrast-125" />
                  )}
                  {p.kind === "video" && (
                    <span className="absolute top-1 right-1 grid size-5 place-items-center border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]">
                      <Icon d={ICONS.play} className="size-2.5" />
                    </span>
                  )}
                </button>
                <span className="truncate text-center text-[10px] text-[var(--gray)] tabular-nums">{fmtDate(p.at)}</span>
              </li>
            ))}
            {/* Empty boxes keep the grid's shape until there's a full row */}
            {Array.from({ length: Math.max(0, 3 - page.length) }, (_, i) => (
              <li key={`empty-${i}`} className="flex flex-col gap-1" aria-hidden>
                <div className="aspect-square border border-dashed border-[var(--gray)]" />
                <span className="text-[10px]">&nbsp;</span>
              </li>
            ))}
          </ul>
        )}

        {photos !== null && visible.length === 0 && (
          <p className="pt-4 text-center text-sm text-[var(--gray)]">
            {photos.length === 0 ? "No photos yet. Photos you post will show up here." : "Nothing tagged that. Try another tag."}
          </p>
        )}

        {visible.length > limit && (
          <div className="flex justify-center py-6">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="h-10 rounded-full border border-[var(--ink)] px-5 text-sm font-semibold transition-colors duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.97]"
            >
              Load more · {visible.length - limit}
            </button>
          </div>
        )}
        <div className="h-6" />
      </div>

      {open !== null && visible[open] && (
        <PhotoViewer
          photos={visible}
          index={open}
          onIndex={(i) => {
            setOpen(i);
            if (i >= limit) setLimit(i + 1);
          }}
          onClose={() => setOpen(null)}
          onDelete={remove}
        />
      )}
    </section>
  );
}
