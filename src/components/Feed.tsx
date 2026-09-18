"use client";

import { useRef, useState } from "react";
import { addComment, deleteComment, toggleLike } from "@/app/actions";
import {
  commentsFor,
  likesFor,
  useFeed,
  type Comment,
} from "@/components/posts";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { Icon } from "@/components/ui";

const ICONS = {
  back: "M15 18l-6-6 6-6",
  plus: "M12 5v14M5 12h14",
  heart: "M12 20s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 10c0 5.65-7 10-7 10z",
  comment: "M4 5h16v11H9l-5 4z",
  send: "M4 12l16-8-6 16-3-7z",
};

const fmtAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1
    ? "now"
    : m < 60
      ? `${m}m`
      : m < 1440
        ? `${Math.floor(m / 60)}h`
        : `${Math.floor(m / 1440)}d`;
};

function Comments({
  comments,
  profile,
  onAdd,
  onDelete,
}: {
  comments: Comment[];
  profile: Profile;
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="fade-in flex flex-col gap-3 border-t border-foreground/15 pt-3">
      {comments.map((c) => {
        const who = PROFILES.find((p) => p.id === c.profileId);
        return (
          <div key={c.id} className="flex items-start gap-2">
            {who && (
              <Avatar profile={who} className="size-7 rounded-full text-xs" />
            )}
            <div className="min-w-0 flex-1 rounded-2xl bg-foreground/5 px-3 py-2">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold">{who?.name ?? "someone"}</span>
                <span className="text-[var(--gray)]">{fmtAgo(c.at)}</span>
                {c.profileId === profile.id && (
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    className="ml-auto text-[var(--gray)] hover:text-[var(--accent)]"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">
                {c.text}
              </p>
            </div>
          </div>
        );
      })}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
      >
        <Avatar profile={profile} className="size-7 rounded-full text-xs" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          aria-label="Comment"
          maxLength={500}
          className="h-9 min-w-0 flex-1 rounded-full border border-foreground/20 bg-transparent px-4 text-sm outline-none focus:border-[var(--ink)]"
        />
        <button
          type="submit"
          aria-label="Send comment"
          disabled={!text.trim()}
          className="grid size-9 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97] disabled:opacity-30"
        >
          <Icon d={ICONS.send} className="size-4" />
        </button>
      </form>
    </div>
  );
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function Feed({
  profile,
  onClose,
  onWrite,
}: {
  profile: Profile;
  onClose: () => void;
  onWrite: () => void;
}) {
  const { feed, loading, error, reload } = useFeed();
  const [openComments, setOpenComments] = useState<string | null>(null);
  const posts = loading ? null : feed.posts;

  const run = (fn: () => Promise<unknown>) => fn().then(reload, reload);

  // Optimistic likes: the heart flips on touch, the server catches up behind it.
  const [want, setWant] = useState<Record<string, boolean>>({});
  const wantRef = useRef<Record<string, boolean>>({});
  const confirmed = useRef<Record<string, boolean>>({});
  const busy = useRef(new Set<string>());
  const [bursts, setBursts] = useState<Record<string, number>>({});
  const lastTap = useRef<{ id: string; at: number } | null>(null);

  const sync = async (id: string, serverLiked: boolean) => {
    if (busy.current.has(id)) return;
    busy.current.add(id);
    let cur = confirmed.current[id] ?? serverLiked;
    try {
      while (wantRef.current[id] !== undefined && wantRef.current[id] !== cur) {
        await toggleLike(id);
        cur = !cur;
      }
    } catch {
      delete wantRef.current[id];
    } finally {
      confirmed.current[id] = cur;
      busy.current.delete(id);
      await reload();
      if (wantRef.current[id] === undefined || wantRef.current[id] === cur) {
        delete wantRef.current[id];
        delete confirmed.current[id];
        setWant({ ...wantRef.current });
      }
    }
  };

  const setLiked = (id: string, next: boolean, serverLiked: boolean) => {
    wantRef.current[id] = next;
    setWant({ ...wantRef.current });
    void sync(id, serverLiked);
  };

  const onMediaTap = (
    now: number,
    id: string,
    liked: boolean,
    serverLiked: boolean,
  ) => {
    const prev = lastTap.current;
    if (prev && prev.id === id && now - prev.at < 300) {
      lastTap.current = null;
      navigator.vibrate?.(10);
      setBursts((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 }));
      if (!liked) setLiked(id, true, serverLiked);
    } else lastTap.current = { id, at: now };
  };

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
      <header className="enter sticky top-0 z-20 mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15 bg-[var(--paper)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.back} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">
          Feed
        </span>
        <button
          type="button"
          onClick={onWrite}
          aria-label="Write a post"
          className="ink-solid grid size-9 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.plus} className="size-4" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-4">
        {error && (
          <p className="rounded-2xl border border-[var(--accent)] px-4 py-3 text-sm text-[var(--accent)]">
            {error}
          </p>
        )}
        {posts === null ? (
          <div
            role="status"
            aria-label="Loading posts"
            className="flex flex-col gap-4"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-3xl border border-foreground/15 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="skeleton size-9 rounded-full" />
                  <div className="skeleton h-3 w-24 rounded-full" />
                </div>
                <div className="skeleton aspect-[4/3] rounded-2xl" />
                <div className="skeleton h-3 w-3/4 rounded-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="enter m-auto flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-2xl font-semibold tracking-tight">
              No posts yet
            </p>
            <p className="text-sm text-[var(--gray)]">
              Write the first one, {profile.name}.
            </p>
          </div>
        ) : (
          posts.map((post, i) => {
            const author = PROFILES.find((p) => p.id === post.profileId);
            const serverLikes = likesFor(feed, post.id).map((l) => l.profileId);
            const serverLiked = serverLikes.includes(profile.id);
            const liked = want[post.id] ?? serverLiked;
            const likes =
              liked === serverLiked
                ? serverLikes
                : liked
                  ? [...serverLikes, profile.id]
                  : serverLikes.filter((id) => id !== profile.id);
            const comments = commentsFor(feed, post.id);
            const items = post.media;
            return (
              <article
                key={post.id}
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                className="enter flex flex-col gap-3 rounded-3xl border border-foreground/15 p-4"
              >
                <header className="flex items-center gap-3">
                  {author && (
                    <Avatar
                      profile={author}
                      className="size-9 rounded-full text-sm"
                    />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold">
                      {author?.name ?? "someone"}
                      {author?.id === profile.id && (
                        <span className="font-normal text-[var(--gray)]">
                          {" "}
                          · you
                        </span>
                      )}
                    </span>
                    <time
                      dateTime={post.at}
                      className="text-xs text-[var(--gray)]"
                    >
                      {fmtWhen(post.at)}
                    </time>
                    {post.tags && post.tags.length > 0 && (
                      <span className="mt-0.5 text-xs text-[var(--gray)]">
                        {post.tags.join(" · ")}
                      </span>
                    )}
                  </div>
                </header>
                {post.text && (
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      items.length === 0 && post.text.length < 80
                        ? "text-xl"
                        : "text-base"
                    }`}
                  >
                    {post.text}
                  </p>
                )}
                {items.length > 0 && (
                  <div
                    onClick={(e) =>
                      onMediaTap(e.timeStamp, post.id, liked, serverLiked)
                    }
                    className={`relative grid touch-manipulation gap-1 overflow-hidden rounded-2xl select-none ${items.length > 1 ? "grid-cols-2" : ""}`}
                  >
                    {bursts[post.id] && (
                      <svg
                        key={bursts[post.id]}
                        viewBox="0 0 24 24"
                        className="heart-burst pointer-events-none absolute top-1/2 left-1/2 z-10 size-24 text-white drop-shadow-lg"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d={ICONS.heart} />
                      </svg>
                    )}
                    {items
                      .slice(0, 4)
                      .map((m, j) =>
                        m.kind === "video" ? (
                          <video
                            key={m.id}
                            src={m.url}
                            controls
                            playsInline
                            className="aspect-square w-full bg-foreground object-cover"
                          />
                        ) : (
                          <img
                            key={m.id}
                            src={m.url}
                            alt=""
                            draggable={false}
                            className={`w-full object-cover ${items.length === 3 && j === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
                          />
                        ),
                      )}
                  </div>
                )}
                <footer className="flex items-center gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.vibrate?.(5);
                      setLiked(post.id, !liked, serverLiked);
                    }}
                    aria-pressed={liked}
                    className={`flex h-9 touch-manipulation items-center gap-1.5 rounded-full px-3 transition-[color,transform] duration-100 active:scale-90 ${
                      liked ? "text-[var(--accent)]" : "hover:bg-foreground/5"
                    }`}
                  >
                    <svg
                      key={String(liked)}
                      viewBox="0 0 24 24"
                      className={`size-5 ${liked ? "check-pop" : ""}`}
                      fill={liked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d={ICONS.heart} />
                    </svg>
                    <span className="tabular-nums">
                      {likes.length || "Like"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((id) => (id === post.id ? null : post.id))
                    }
                    aria-expanded={openComments === post.id}
                    className="flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors duration-150 hover:bg-foreground/5 active:scale-[0.97]"
                  >
                    <Icon d={ICONS.comment} />
                    <span className="tabular-nums">
                      {comments.length || "Comment"}
                    </span>
                  </button>
                  {likes.length > 0 && (
                    <span className="ml-auto truncate text-xs text-[var(--gray)]">
                      Liked by{" "}
                      {likes
                        .map((id) =>
                          id === profile.id
                            ? "you"
                            : (PROFILES.find((p) => p.id === id)?.name ??
                              "someone"),
                        )
                        .join(" & ")}
                    </span>
                  )}
                </footer>
                {openComments === post.id && (
                  <Comments
                    comments={comments}
                    profile={profile}
                    onAdd={(text) => run(() => addComment(post.id, text))}
                    onDelete={(id) => run(() => deleteComment(id))}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
