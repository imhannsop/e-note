"use client";

import { useEffect, useRef, useState } from "react";
import { listAllPhotos } from "@/components/photos";
import {
  addComment,
  deleteComment,
  listPosts,
  readReactions,
  subscribePosts,
  toggleLike,
  type Comment,
  type Post,
  type Reactions,
} from "@/components/posts";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { Icon } from "@/components/ui";

type Media = { kind: "image" | "video"; url: string };

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
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [media, setMedia] = useState<Record<string, Media>>({});
  const [reactions, setReactions] = useState<Reactions>({
    likes: {},
    comments: {},
  });
  const [openComments, setOpenComments] = useState<string | null>(null);
  const urls = useRef<string[]>([]);

  // Reload whenever a post lands, here or in another tab
  useEffect(() => {
    let alive = true;
    const cache: Record<string, Media> = {};
    async function load() {
      const rows = await listAllPhotos().catch(() => []);
      if (!alive) return;
      // Keep URLs for photos already shown, so a like doesn't reload images
      for (const p of rows)
        cache[p.id] ??= { kind: p.kind, url: URL.createObjectURL(p.blob) };
      urls.current = Object.values(cache).map((m) => m.url);
      setMedia({ ...cache });
      setPosts(listPosts());
      setReactions(readReactions());
    }
    load();
    const stop = subscribePosts(load);
    return () => {
      alive = false;
      stop();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, []);

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
        {posts === null ? null : posts.length === 0 ? (
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
            const likes = reactions.likes[post.id] ?? [];
            const liked = likes.includes(profile.id);
            const comments = reactions.comments[post.id] ?? [];
            const items = [
              ...post.mediaIds.map((id) => media[id]).filter(Boolean),
              ...(post.mediaUrls ?? []),
            ];
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
                  </div>
                </header>
                {post.text && (
                  <p
                    className={`rounded-2xl whitespace-pre-wrap break-words ${post.paper ? `${post.paper} p-4` : ""} ${
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
                    className={`grid gap-1 overflow-hidden rounded-2xl ${items.length > 1 ? "grid-cols-2" : ""}`}
                  >
                    {items.slice(0, 4).map((m, j) =>
                      m.kind === "video" ? (
                        <video
                          key={j}
                          src={m.url}
                          controls
                          playsInline
                          className="aspect-square w-full bg-foreground object-cover"
                        />
                      ) : (
                        // Blob URLs can't go through next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={j}
                          src={m.url}
                          alt=""
                          className={`w-full object-cover ${items.length === 3 && j === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
                        />
                      ),
                    )}
                  </div>
                )}
                <footer className="flex items-center gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id, profile.id)}
                    aria-pressed={liked}
                    className={`flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors duration-150 active:scale-[0.97] ${
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
                    onAdd={(text) => addComment(post.id, profile.id, text)}
                    onDelete={(id) => deleteComment(post.id, id)}
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
