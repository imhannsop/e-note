"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/components/loading";
import { deletePost, getProfileMeta, saveProfileMeta } from "@/app/actions";
import {
  commentsFor,
  likesFor,
  tagsOf,
  useFeed,
  type Post,
} from "@/components/posts";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { InkStroke } from "@/components/Splash";
import { Icon, Step } from "@/components/ui";

const PAGE = 24;

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  play: "M8 5v14l11-7z",
  stack: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
};

type Meta = { name: string; bio: string };
type Media = { kind: "image" | "video"; url: string };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const tagsOfPost = (p: Post) => [
  ...new Set([
    ...tagsOf(p.text),
    ...(p.tags ?? []).map((t) => t.toLowerCase()),
  ]),
];

const TEXTURES = ["ink-dots", "ink-lines", "ink-grid"];

const nameOf = (id: string) => PROFILES.find((p) => p.id === id);

function MediaThumb({ m, className }: { m: Media; className: string }) {
  return m.kind === "video" ? (
    <video
      src={m.url}
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  ) : (
    <img src={m.url} alt="" loading="lazy" className={className} />
  );
}

export default function Gallery({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<Meta>({ name: profile.name, bio: "" });
  const [editing, setEditing] = useState(false);
  const { feed, loading, reload } = useFeed();
  const posts = loading
    ? null
    : feed.posts.filter((p) => p.profileId === profile.id);
  const [tag, setTag] = useState<string | null>(null);
  const [newest, setNewest] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    track(getProfileMeta(profile.id)).then(setMeta, () => {});
  }, [profile.id]);

  const mediaOf = (p: Post): Media[] => p.media;
  const likesOf = (id: string) => likesFor(feed, id).map((l) => l.profileId);
  const commentsOf = (id: string) => commentsFor(feed, id);

  const tags = useMemo(
    () => [...new Set((posts ?? []).flatMap(tagsOfPost))].sort(),
    [posts],
  );

  const visible = useMemo(
    () =>
      (posts ?? [])
        .filter((p) => !tag || tagsOfPost(p).includes(tag))
        .sort((a, b) =>
          newest ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at),
        ),
    [posts, tag, newest],
  );

  const page = visible.slice(0, limit);
  const totals = (posts ?? []).reduce(
    (t, p) => ({
      likes: t.likes + likesOf(p.id).length,
      comments: t.comments + commentsOf(p.id).length,
    }),
    { likes: 0, comments: 0 },
  );
  const shown = visible.find((p) => p.id === open);
  const first = (posts ?? []).reduce<string | null>(
    (min, p) => (!min || p.at < min ? p.at : min),
    null,
  );
  const since =
    first &&
    new Date(first).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  async function remove(post: Post) {
    await deletePost(post.id).catch(() => {});
    setOpen(null);
    reload();
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
      <header className="enter sticky top-0 z-20 mx-4 flex h-14 shrink-0 items-center justify-between border-b-[1.5px] border-foreground bg-[var(--paper)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight">
          Profile
        </h1>
        <span className="size-10" aria-hidden />
      </header>

      <div
        className="enter mx-4 mt-5 flex flex-col gap-4"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-end justify-between gap-4">
          {editing ? (
            <form
              className="flex min-w-0 flex-1 flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(false);
                saveProfileMeta(meta).catch(() => {});
              }}
            >
              <input
                autoFocus
                value={meta.name}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, name: e.target.value }))
                }
                aria-label="Name"
                className="border-b-[1.5px] border-foreground bg-transparent text-4xl font-semibold tracking-tighter outline-none"
              />
              <input
                value={meta.bio}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, bio: e.target.value }))
                }
                placeholder="A line about you"
                aria-label="Bio"
                maxLength={80}
                className="border-b border-foreground/30 bg-transparent text-sm outline-none placeholder:text-[var(--gray)]"
              />
              <button
                type="submit"
                className="ink-solid h-8 self-start rounded-full px-4 text-xs font-semibold"
              >
                Done
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="group flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
            >
              <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
                {since ? `Writing since ${since}` : "A fresh notebook"}
              </span>
              <span className="text-6xl leading-[0.9] font-semibold tracking-tighter break-words">
                {meta.name.trim() || profile.name}
                <span className="text-[var(--accent)]">.</span>
              </span>
              <span className="mt-1 text-lg text-[var(--gray)]">
                {meta.bio || "Tap to add a bio"}
                <span className="ml-2 text-[10px] tracking-widest uppercase opacity-0 transition-opacity group-hover:opacity-100">
                  edit
                </span>
              </span>
            </button>
          )}
          <Avatar
            profile={profile}
            className="size-24 shrink-0 rotate-3 rounded-3xl text-4xl ring-[1.5px] ring-foreground ring-offset-4 ring-offset-[var(--paper)]"
          />
        </div>

        {}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              [posts?.length ?? 0, "Posts", "ink-solid"],
              [totals.likes, "Likes", "ink-dots"],
              [totals.comments, "Comments", "ink-lines"],
            ] as const
          ).map(([n, label, tile], i) => (
            <div
              key={label}
              className={`ink-fill relative flex h-24 flex-col justify-end overflow-hidden rounded-2xl p-3 ${tile}`}
            >
              <span className="absolute top-2 left-3 text-[10px] font-medium tabular-nums opacity-50">
                0{i + 1}
              </span>
              <span
                className={`text-3xl leading-none font-semibold tracking-tighter tabular-nums ${
                  label === "Likes" && n > 0 ? "text-[var(--accent)]" : ""
                }`}
              >
                {n}
              </span>
              <span className="text-xs opacity-60">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="enter mx-4 mt-8 flex flex-col gap-3"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <Step n={4} label={`Entries · ${visible.length}`} />
          <button
            type="button"
            onClick={() => setNewest((n) => !n)}
            aria-label={`Sort by ${newest ? "newest" : "oldest"} first, tap to switch`}
            className="ink-solid flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs transition-transform duration-200 active:scale-[0.97]"
          >
            <span className="opacity-60">Sort by:</span>
            <span className="font-semibold">
              {newest ? "Newest" : "Oldest"}
            </span>
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
                className={`h-8 shrink-0 rounded-full border-[1.5px] border-foreground px-3 text-xs font-medium capitalize transition-all duration-200 active:scale-[0.97] ${
                  tag === t ? "ink-solid" : "hover:bg-foreground/5"
                }`}
              >
                {tag === t ? "✓ " : ""}
                {t ?? "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="enter mt-3 flex-1 px-4"
        style={{ animationDelay: "180ms" }}
      >
        {posts === null && (
          <ul
            role="status"
            aria-label="Loading posts"
            className="grid grid-cols-3 gap-3"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <li
                key={i}
                className={`skeleton aspect-square rounded-3xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              />
            ))}
          </ul>
        )}
        {posts !== null && (
          <ul className="grid grid-flow-dense grid-cols-3 gap-3">
            {page.map((p, i) => {
              const media = mediaOf(p);
              const likes = likesOf(p.id).length;
              const comments = commentsOf(p.id).length;
              const big = i === 0 && !tag;
              return (
                <li
                  key={p.id}
                  className={`min-w-0 ${big ? "col-span-2 row-span-2" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(p.id)}
                    aria-label={`Open post from ${fmtDate(p.at)}`}
                    style={{ animationDelay: `${200 + Math.min(i, 9) * 40}ms` }}
                    className={`enter group ink-fill relative block aspect-square w-full overflow-hidden rounded-2xl text-left transition-transform duration-200 hover:-rotate-1 active:scale-[0.97] ${
                      media[0] ? "" : TEXTURES[i % TEXTURES.length]
                    } ${big ? "rounded-3xl" : ""}`}
                  >
                    {media[0] ? (
                      <MediaThumb
                        m={media[0]}
                        className="size-full object-cover grayscale contrast-125 transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        className={`absolute inset-x-2 bottom-7 rounded bg-[var(--paper)] px-1 leading-tight font-semibold tracking-tight ${
                          big
                            ? "line-clamp-6 text-2xl"
                            : "line-clamp-5 text-[11px]"
                        }`}
                      >
                        {p.text}
                      </span>
                    )}
                    <span className="absolute top-2 left-2 rounded bg-[var(--paper)] px-1 text-[10px] font-medium tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {(media.length > 1 || media[0]?.kind === "video") && (
                      <span className="ink-solid absolute top-2 right-2 grid size-5 place-items-center rounded-full">
                        <Icon
                          d={media.length > 1 ? ICONS.stack : ICONS.play}
                          className="size-2.5"
                        />
                      </span>
                    )}
                    <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 text-[10px] font-semibold tabular-nums">
                      <span className="truncate rounded bg-[var(--paper)] px-1 font-medium text-[var(--gray)]">
                        {big
                          ? fmtDate(p.at)
                          : new Date(p.at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                      </span>
                      {(likes > 0 || comments > 0) && (
                        <span className="flex shrink-0 gap-1.5 rounded-full bg-[var(--paper)] px-1.5">
                          {likes > 0 && (
                            <span className="text-[var(--accent)]">
                              ♥{likes}
                            </span>
                          )}
                          {comments > 0 && <span>💬{comments}</span>}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {Array.from({ length: Math.max(0, 3 - page.length) }, (_, i) => (
              <li key={`empty-${i}`} aria-hidden>
                <div className="aspect-square rounded-2xl border-[1.5px] border-dashed border-[var(--gray)]" />
              </li>
            ))}
          </ul>
        )}

        {posts !== null && visible.length === 0 && (
          <p className="pt-4 text-center text-sm text-[var(--gray)]">
            {posts.length === 0
              ? "No posts yet. What you post will show up here."
              : "Nothing tagged that. Try another tag."}
          </p>
        )}

        {visible.length > limit ? (
          <div className="flex justify-center py-6">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="ink-solid h-10 rounded-full px-5 text-sm font-semibold transition-transform duration-200 active:scale-[0.97]"
            >
              Load more · {visible.length - limit}
            </button>
          </div>
        ) : (
          visible.length > 0 && (
            <div className="flex flex-col items-center gap-2 pt-10 pb-4">
              <InkStroke className="w-24 opacity-60" />
              <span className="text-[10px] font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
                That&apos;s every page
              </span>
            </div>
          )
        )}
        <div className="h-6" />
      </div>

      {shown && (
        <div
          className="fade-in fixed inset-0 z-30 flex flex-col bg-[var(--paper)]"
          role="dialog"
          aria-label="Post"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <header className="mx-4 flex h-14 shrink-0 items-center justify-between border-b-[1.5px] border-foreground">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close post"
              className="-ml-2 grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
            >
              <Icon d={ICONS.close} />
            </button>
            <span className="font-bold tracking-tight">Entry</span>
            {shown.profileId !== profile.id ? (
              <span className="size-10" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={() => confirm("Delete this post?") && remove(shown)}
                aria-label="Delete post"
                className="-mr-2 grid size-10 place-items-center rounded-full text-[var(--gray)] transition-colors hover:text-[var(--accent)]"
              >
                <Icon d={ICONS.trash} />
              </button>
            )}
          </header>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 overflow-y-auto px-4 pt-5 pb-8">
            <div className="enter flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
                  {new Date(shown.at).toLocaleDateString(undefined, {
                    weekday: "long",
                  })}{" "}
                  ·{" "}
                  {new Date(shown.at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <p className="text-4xl leading-[0.95] font-semibold tracking-tighter">
                  {new Date(shown.at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                  <span className="text-[var(--gray)]">
                    {" "}
                    {new Date(shown.at).getFullYear()}
                  </span>
                </p>
              </div>
              <Avatar
                profile={profile}
                className="size-12 shrink-0 -rotate-3 rounded-2xl text-xl ring-[1.5px] ring-foreground ring-offset-2 ring-offset-[var(--paper)]"
              />
            </div>

            {shown.tags && shown.tags.length > 0 && (
              <div
                className="enter -mt-3 flex flex-wrap gap-1.5"
                style={{ animationDelay: "40ms" }}
              >
                {shown.tags.map((t) => (
                  <span
                    key={t}
                    className="ink-solid rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {mediaOf(shown).length > 0 && (
              <section
                className="enter flex flex-col gap-3"
                style={{ animationDelay: "120ms" }}
              >
                <Step n={1} label={`Pinned · ${mediaOf(shown).length}`} />
                {mediaOf(shown).map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl bg-[var(--paper)] p-2 shadow-[3px_3px_0_var(--foreground)] ring-[1.5px] ring-foreground ${
                      i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"
                    }`}
                  >
                    {m.kind === "video" ? (
                      <video
                        src={m.url}
                        controls
                        playsInline
                        className="w-full rounded-xl"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt=""
                        className="w-full rounded-xl grayscale"
                      />
                    )}
                    <span className="block pt-1.5 text-center font-mono text-[10px] tracking-widest text-[var(--gray)]">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(mediaOf(shown).length).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {shown.text && (
              <p
                className="enter text-base leading-relaxed break-words whitespace-pre-wrap"
                style={{ animationDelay: "60ms" }}
              >
                <b className="mr-1.5 font-semibold">{profile.name}</b>
                {shown.text}
              </p>
            )}

            <section
              className="enter flex flex-col gap-2"
              style={{ animationDelay: "180ms" }}
            >
              <Step n={2} label={`Likes · ${likesOf(shown.id).length}`} />
              {likesOf(shown.id).length > 0 ? (
                <div className="ink-fill ink-dots flex items-center gap-3 rounded-2xl p-3">
                  <span className="flex -space-x-2">
                    {likesOf(shown.id).map((id) => {
                      const who = nameOf(id);
                      return who ? (
                        <Avatar
                          key={id}
                          profile={who}
                          className="size-8 rounded-full text-xs ring-2 ring-[var(--paper)]"
                        />
                      ) : null;
                    })}
                  </span>
                  <span className="rounded bg-[var(--paper)] px-1 text-sm">
                    <span className="text-[var(--accent)]">♥</span> Liked by{" "}
                    <b>
                      {likesOf(shown.id)
                        .map((id) => nameOf(id)?.name ?? "someone")
                        .join(" & ")}
                    </b>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-[var(--gray)]">No likes yet.</p>
              )}
            </section>

            <section
              className="enter flex flex-col gap-2"
              style={{ animationDelay: "240ms" }}
            >
              <Step n={3} label={`Comments · ${commentsOf(shown.id).length}`} />
              {commentsOf(shown.id).map((c) => {
                const who = nameOf(c.profileId);
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    {who && (
                      <Avatar
                        profile={who}
                        className="size-8 shrink-0 rounded-xl text-xs"
                      />
                    )}
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border-[1.5px] border-foreground px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-sm">{who?.name ?? "someone"}</b>
                        <span className="text-[10px] tracking-widest text-[var(--gray)] uppercase tabular-nums">
                          {fmtDate(c.at)}
                        </span>
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {c.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              {commentsOf(shown.id).length === 0 && (
                <p className="text-sm text-[var(--gray)]">No comments yet.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
