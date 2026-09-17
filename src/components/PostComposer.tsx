"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, type Profile } from "@/components/profiles";
import { publishPost } from "@/components/posts";
import { InkStroke } from "@/components/Splash";
import { Icon, RULED, Step, useKeyboardInset } from "@/components/ui";

type Kind = "image" | "video";
type Media = { id: string; url: string; kind: Kind; file: File };
type Draft = { text: string; tags: string[] };

const MAX = 2000;
const TAGS = ["Morning", "Work", "Personal"];

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  photo:
    "M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3zM21 15l-5-5L5 21M9 9h.01",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  plus: "M12 5v14M5 12h14",
};

const ACCEPT: Record<Kind, string> = { image: "image/*", video: "video/*" };

function loadDraft(key: string): Draft {
  try {
    return {
      text: "",
      tags: [],
      ...JSON.parse(localStorage.getItem(key) ?? "{}"),
    };
  } catch {
    return { text: "", tags: [] };
  }
}

export default function PostComposer({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const draftKey = `ink:draft:${profile.id}`;
  const [text, setText] = useState(() => loadDraft(draftKey).text);
  const [tags, setTags] = useState<string[]>(() => loadDraft(draftKey).tags);
  const [media, setMedia] = useState<Media[]>([]);
  const [dragging, setDragging] = useState(false);
  const [posted, setPosted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const keyboard = useKeyboardInset();

  // Release object URLs when the composer is torn down
  const mediaRef = useRef(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  useEffect(
    () => () => mediaRef.current.forEach((m) => URL.revokeObjectURL(m.url)),
    [],
  );

  // Drafts save as you type; media stays in memory only
  useEffect(() => {
    if (posted) return;
    try {
      if (text || tags.length)
        localStorage.setItem(draftKey, JSON.stringify({ text, tags }));
      else localStorage.removeItem(draftKey);
    } catch {}
  }, [draftKey, text, tags, posted]);

  const canPost = !posted && text.trim() !== "";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function pick(kind: Kind) {
    if (!picker.current) return;
    picker.current.accept = ACCEPT[kind];
    picker.current.click();
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        kind: file.type.startsWith("video/")
          ? ("video" as const)
          : ("image" as const),
        file,
      }));
    setMedia((m) => [...m, ...added]);
  }

  function remove(id: string) {
    setMedia((m) => {
      const gone = m.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return m.filter((x) => x.id !== id);
    });
  }

  function toggleTag(tag: string) {
    setTags((t) =>
      t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag],
    );
  }

  async function post() {
    if (!canPost || sending) return;
    setSending(true);
    setError(null);
    try {
      await publishPost(
        text.trim(),
        tags,
        media.map((m) => ({ file: m.file, kind: m.kind })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post. Try again.");
      setSending(false);
      return;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setPosted(true);
    setTimeout(onClose, 1600);
  }

  const hasDraft = text !== "" || tags.length > 0;

  if (posted) {
    return (
      <section
        role="status"
        className="composer fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
      >
        <InkStroke className="w-40" />
        <span
          className="enter text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase"
          style={{ animationDelay: "500ms" }}
        >
          Inked into the feed
        </span>
      </section>
    );
  }

  return (
    <section
      className="composer fixed inset-x-0 top-0 z-50 flex flex-col"
      style={{
        bottom: keyboard,
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Header */}
      <header className="enter relative mx-4 flex h-14 shrink-0 items-center justify-between border-b-[1.5px] border-foreground">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-ml-2 grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight">
          New entry
        </h1>
        <button
          type="button"
          onClick={post}
          disabled={!canPost || sending}
          className={`h-9 rounded-full px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
            canPost && !sending
              ? "bg-[var(--accent)] text-white"
              : "border-[1.5px] border-[var(--gray)] text-[var(--gray)]"
          }`}
        >
          {sending ? "Posting…" : "Post"}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-2xl border-[1.5px] border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]"
        >
          {error}
        </p>
      )}

      {/* Composition */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pt-5 pb-6"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        {/* Who and when, in the home screen's voice */}
        <div className="enter flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-[0.3em] text-[var(--gray)] uppercase">
              {today}
            </span>
            <p className="text-4xl leading-[0.95] font-semibold tracking-tighter">
              Dear diary,
              <br />
              <span className="text-[var(--gray)]">
                it&apos;s {profile.name}.
              </span>
            </p>
          </div>
          <Avatar
            profile={profile}
            className="size-14 -rotate-3 rounded-2xl text-2xl ring-[1.5px] ring-foreground ring-offset-2 ring-offset-background"
          />
        </div>

        {/* 01: the page you write on */}
        <section
          className="enter flex flex-col gap-2"
          style={{ animationDelay: "60ms" }}
        >
          <Step n={1} label="Write" />
          <label className="ink-fill relative block overflow-hidden rounded-3xl">
            <span className="sr-only">Entry text</span>
            {/* Margin rule, like a notebook */}
            <span
              className="pointer-events-none absolute inset-y-0 left-10 w-px bg-[var(--accent)]/40"
              aria-hidden
            />
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              placeholder="What's on your mind?"
              style={RULED}
              className="field-sizing-content block min-h-48 w-full resize-none bg-transparent pt-4 pr-4 pb-10 pl-14 text-lg leading-8 outline-none placeholder:text-[var(--gray)]"
            />
            <span
              className={`pointer-events-none absolute right-4 bottom-3 rounded-full bg-background px-2 text-[11px] font-medium tabular-nums ${
                text.length > MAX * 0.9
                  ? "text-[var(--accent)]"
                  : "text-[var(--gray)]"
              }`}
            >
              {text.length}/{MAX}
            </span>
          </label>
        </section>

        {/* 02: media, optional */}
        <section
          className="enter flex flex-col gap-2"
          style={{ animationDelay: "120ms" }}
        >
          <Step n={2} label="Attach" optional />
          {dragging ? (
            <div className="ink-solid fade-in grid h-32 place-items-center rounded-3xl text-lg font-semibold tracking-tight">
              Drop to attach
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    kind: "image",
                    label: "Photo",
                    hint: "JPG, PNG, HEIC",
                    d: ICONS.photo,
                    tile: "ink-dots",
                  },
                  {
                    kind: "video",
                    label: "Video",
                    hint: "MP4, MOV",
                    d: ICONS.video,
                    tile: "ink-lines",
                  },
                ] as const
              ).map((a) => (
                <button
                  key={a.kind}
                  type="button"
                  onClick={() => pick(a.kind)}
                  className={`ink-fill group relative flex h-32 flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition-transform duration-200 active:scale-[0.97] ${a.tile}`}
                >
                  {/* Texture fades out behind the label, like the home tiles */}
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background from-35% to-transparent"
                    aria-hidden
                  />
                  <span className="relative flex justify-end">
                    <span className="relative grid size-10 place-items-center rounded-full border-[1.5px] border-current bg-background transition-transform duration-300 group-hover:-rotate-12">
                      <Icon
                        d={a.d}
                        className="size-[18px] transition-all duration-300 group-hover:scale-50 group-hover:opacity-0"
                      />
                      <Icon
                        d={ICONS.plus}
                        className="absolute size-[18px] scale-50 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:rotate-12 group-hover:opacity-100"
                      />
                    </span>
                  </span>
                  <span className="relative flex flex-col">
                    <span className="text-lg font-semibold tracking-tight">
                      {a.label}
                    </span>
                    <span className="text-xs opacity-60">{a.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {!dragging && media.length === 0 && (
            <p className="text-xs text-[var(--gray)]">
              Tap to upload or drag files
            </p>
          )}

          {media.length > 0 && (
            <ul className="flex flex-wrap gap-3 pt-2">
              {media.map((m, i) => (
                <li
                  key={m.id}
                  className={`check-pop relative size-20 rounded-xl bg-background p-1 shadow-[2px_2px_0_var(--foreground)] ring-[1.5px] ring-foreground ${
                    i % 2 ? "rotate-2" : "-rotate-2"
                  }`}
                >
                  <span className="block size-full overflow-hidden rounded-lg">
                    {m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                      <img
                        src={m.url}
                        alt=""
                        className="size-full object-cover grayscale"
                      />
                    ) : (
                      <video
                        src={m.url}
                        muted
                        playsInline
                        className="size-full object-cover grayscale"
                      />
                    )}
                  </span>
                  <span className="absolute bottom-2 left-2 rounded bg-background px-1 text-[10px] font-medium tabular-nums">
                    {m.kind === "video" ? "▶ " : ""}
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    aria-label="Remove"
                    className="ink-solid absolute -top-2 -right-2 grid size-6 place-items-center rounded-full transition-transform duration-200 active:scale-90"
                  >
                    <Icon d={ICONS.close} className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 03: mood, optional */}
        <section
          className="enter flex flex-col gap-2"
          style={{ animationDelay: "180ms" }}
        >
          <Step n={3} label="Mood" optional />
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={on}
                  className={`h-9 rounded-full border-[1.5px] border-foreground px-4 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                    on ? "ink-solid" : ""
                  }`}
                >
                  {on ? "✓ " : ""}
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="mx-4 flex shrink-0 items-center justify-between border-t-[1.5px] border-foreground py-3"
        style={{
          paddingBottom:
            keyboard > 0
              ? undefined
              : "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <span className="text-[11px] font-medium tracking-[0.2em] text-[var(--gray)] uppercase">
          {hasDraft ? "● Draft saved" : "Text required"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-2 text-sm font-medium text-[var(--gray)] transition-colors hover:text-foreground"
        >
          {hasDraft ? "Save draft" : "Cancel"}
        </button>
      </footer>

      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );
}
