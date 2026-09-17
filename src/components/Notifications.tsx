"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  listPosts,
  readReactions,
  subscribePosts,
  type Post,
} from "@/components/posts";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { Icon } from "@/components/ui";

type Notice = {
  id: string;
  kind: "like" | "comment" | "post";
  from: Profile;
  post: Post;
  text?: string;
  at: string;
};

const ICONS = {
  bell: "M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0",
  close: "M6 6l12 12M18 6L6 18",
  comment: "M4 5h16v11H9l-5 4z",
  plus: "M12 5v14M5 12h14",
};

const VERB = {
  like: "liked your post",
  comment: "commented on your post",
  post: "shared a new post",
};

const seenKey = (id: string) => `ink:notif-seen:${id}`;

// Everything the other profiles did that involves this one, newest first.
// When a database arrives, this becomes a single query.
function buildNotices(me: Profile): Notice[] {
  const posts = listPosts();
  const r = readReactions();
  const who = (id: string) => PROFILES.find((p) => p.id === id);
  const out: Notice[] = [];
  for (const post of posts) {
    if (post.profileId === me.id) {
      for (const id of r.likes[post.id] ?? []) {
        const from = who(id);
        // Likes from before timestamps were kept fall back to the post's time
        if (from && id !== me.id)
          out.push({
            id: `l-${post.id}-${id}`,
            kind: "like",
            from,
            post,
            at: r.likedAt?.[post.id]?.[id] ?? post.at,
          });
      }
      for (const c of r.comments[post.id] ?? []) {
        const from = who(c.profileId);
        if (from && c.profileId !== me.id)
          out.push({
            id: `c-${c.id}`,
            kind: "comment",
            from,
            post,
            text: c.text,
            at: c.at,
          });
      }
    } else {
      const from = who(post.profileId);
      if (from)
        out.push({ id: `p-${post.id}`, kind: "post", from, post, at: post.at });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

const fmtAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  if (m < 10080) return `${Math.floor(m / 1440)}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function Notifications({
  profile,
  onOpenFeed,
}: {
  profile: Profile;
  onOpenFeed: () => void;
}) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seen, setSeen] = useState("");
  const [open, setOpen] = useState(false);
  // Where the dropdown sits: just under the bell, pointer aimed at its center
  const [anchor, setAnchor] = useState({ top: 0, caret: 0 });
  const bell = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const load = () => {
      setNotices(buildNotices(profile));
      try {
        setSeen(localStorage.getItem(seenKey(profile.id)) ?? "");
      } catch {}
    };
    load();
    return subscribePosts(load);
  }, [profile]);

  const unread = notices.filter((n) => n.at > seen).length;

  function place() {
    const r = bell.current?.getBoundingClientRect();
    if (r)
      setAnchor({
        top: r.bottom + 10,
        caret: window.innerWidth - (r.left + r.width / 2),
      });
  }

  function show() {
    if (open) return close();
    place();
    setOpen(true);
    // Mark read on open; the list keeps its highlight until closed
    try {
      localStorage.setItem(seenKey(profile.id), new Date().toISOString());
    } catch {}
  }

  function close() {
    setOpen(false);
    try {
      setSeen(localStorage.getItem(seenKey(profile.id)) ?? "");
    } catch {}
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  });

  return (
    <>
      <button
        ref={bell}
        type="button"
        onClick={show}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        className="relative grid size-8 place-items-center rounded-full border border-foreground/20 transition-transform duration-200 active:scale-[0.97]"
      >
        <Icon d={ICONS.bell} className="size-4" />
        {unread > 0 && (
          <span className="check-pop absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#c8321f] px-1 text-[10px] leading-none font-semibold text-white tabular-nums dark:bg-[#f06a55]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Portaled to <body> so animated (transformed) parents can't trap it under the cards */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Invisible click-away layer */}
            <button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              onClick={close}
              className="absolute inset-0 cursor-default"
            />
            <div
              className="drop-in absolute right-4 flex w-[min(24rem,calc(100vw-2rem))] flex-col rounded-3xl border-[1.5px] border-foreground bg-background shadow-[4px_4px_0_var(--foreground)]"
              style={{
                top: anchor.top,
                maxHeight: `calc(100dvh - ${anchor.top + 16}px)`,
              }}
            >
              {/* Pointer up to the bell */}
              <span
                aria-hidden
                className="absolute -top-[7px] size-3 rotate-45 border-t-[1.5px] border-l-[1.5px] border-foreground bg-background"
                style={{ right: anchor.caret - 16 - 6 }}
              />
              <header className="mx-5 flex shrink-0 items-end justify-between gap-3 border-b-[1.5px] border-foreground pt-4 pb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-[0.3em] text-foreground/50 uppercase">
                    {unread ? `${unread} new` : "All caught up"}
                  </span>
                  <h2 className="text-2xl leading-none font-semibold tracking-tighter">
                    Notifications
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="-mr-2 grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
                >
                  <Icon d={ICONS.close} />
                </button>
              </header>

              <ul className="flex flex-col overflow-y-auto px-3 py-2">
                {notices.length === 0 && (
                  <li className="ink-fill ink-dots m-2 grid h-32 place-items-center rounded-2xl text-sm">
                    <span className="rounded bg-background px-2 text-foreground/60">
                      Nothing yet. Likes and comments land here.
                    </span>
                  </li>
                )}
                {notices.map((n, i) => {
                  const fresh = n.at > seen;
                  return (
                    <li
                      key={n.id}
                      className="enter"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          onOpenFeed();
                        }}
                        className="flex w-full items-start gap-3 rounded-2xl p-2 text-left transition-colors duration-150 hover:bg-foreground/5"
                      >
                        <span className="relative shrink-0">
                          <Avatar
                            profile={n.from}
                            className="size-11 rounded-2xl text-lg"
                          />
                          <span
                            className={`absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full border-[1.5px] border-background text-[10px] leading-none ${
                              n.kind === "like"
                                ? "bg-[#c8321f] text-white dark:bg-[#f06a55]"
                                : "ink-solid"
                            }`}
                          >
                            {n.kind === "like" ? (
                              "♥"
                            ) : (
                              <Icon
                                d={
                                  n.kind === "comment"
                                    ? ICONS.comment
                                    : ICONS.plus
                                }
                                className="size-2.5"
                              />
                            )}
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm leading-snug">
                            <b className="font-semibold">{n.from.name}</b>{" "}
                            {VERB[n.kind]}
                            <span className="text-foreground/50">
                              {" "}
                              · {fmtAgo(n.at)}
                            </span>
                          </span>
                          {n.text && (
                            <span className="line-clamp-2 text-sm">
                              “{n.text}”
                            </span>
                          )}
                          {n.post.text && (
                            <span className="truncate text-xs text-foreground/50">
                              {n.kind === "post" ? "" : "on: "}
                              {n.post.text}
                            </span>
                          )}
                        </span>
                        {fresh && (
                          <span
                            className="mt-2 size-2 shrink-0 rounded-full bg-[#c8321f] dark:bg-[#f06a55]"
                            aria-label="New"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
