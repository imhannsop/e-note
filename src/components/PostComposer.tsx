"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, type Profile } from "@/components/profiles";
import { savePhotos } from "@/components/photos";
import { Icon, useKeyboardInset } from "@/components/ui";

type Media = { id: string; url: string; kind: "image" | "video"; file: File };

// Paper the post is written on, reusing the e-ink tile textures
const PAPERS = [
  { id: "plain", label: "Plain", className: "" },
  { id: "dots", label: "Dots", className: "ink-dots" },
  { id: "lines", label: "Lines", className: "ink-lines" },
  { id: "grid", label: "Grid", className: "ink-grid" },
];

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  media:
    "M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3zM21 15l-5-5L5 21M9 9h.01",
  paper: "M4 4h16v16H4zM4 9h16M4 14h16M9 4v16",
  plus: "M12 5v14M5 12h14",
  back: "M15 18l-6-6 6-6",
};

// Drawer: the action cards, or the paper picker
type Drawer = "expanded" | "paper";

// Collage frame and tile placement per photo count; 5+ shows a "+N" tile
const COLLAGES: Record<number, { frame: string; tiles: string[] }> = {
  1: { frame: "grid-cols-1 aspect-[4/3]", tiles: [""] },
  2: { frame: "grid-cols-2 aspect-[2/1]", tiles: ["", ""] },
  3: { frame: "grid-cols-2 grid-rows-2 aspect-square", tiles: ["row-span-2", "", ""] },
  4: { frame: "grid-cols-2 grid-rows-2 aspect-square", tiles: ["", "", "", ""] },
  5: {
    frame: "grid-cols-6 grid-rows-[3fr_2fr] aspect-square",
    tiles: ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"],
  },
};

function Collage({
  media,
  onRemove,
}: {
  media: Media[];
  onRemove: (id: string) => void;
}) {
  const shown = media.slice(0, 5);
  const extra = media.length - shown.length;
  const { frame, tiles } = COLLAGES[shown.length];

  return (
    <ul
      className={`grid w-full gap-1 overflow-hidden rounded-2xl transition-[aspect-ratio] duration-300 ${frame}`}
    >
      {shown.map((m, i) => (
        <li
          key={m.id}
          className={`enter group relative min-h-0 overflow-hidden bg-foreground/10 ${tiles[i]}`}
        >
          {m.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={m.url}
              alt=""
              className="size-full object-cover grayscale transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <video
              src={m.url}
              muted
              playsInline
              loop
              autoPlay
              className="size-full object-cover grayscale"
            />
          )}
          {extra > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 grid place-items-center bg-foreground/60 text-3xl font-semibold text-background">
              +{extra}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            aria-label="Remove"
            className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-foreground/80 text-background backdrop-blur transition-transform duration-200 active:scale-90"
          >
            <Icon d={ICONS.close} className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PostComposer({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [paper, setPaper] = useState(PAPERS[0]);
  const [drawer, setDrawer] = useState<Drawer>("expanded");
  const [posted, setPosted] = useState(false);
  const keyboard = useKeyboardInset();

  // Free preview URLs when leaving the composer
  const mediaRef = useRef(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  useEffect(
    () => () => mediaRef.current.forEach((m) => URL.revokeObjectURL(m.url)),
    [],
  );

  const canPost = !posted && (text.trim() !== "" || media.length > 0);
  // Short posts read big, like Facebook; long ones settle to body size
  const textSize =
    media.length === 0 && text.length < 80
      ? "text-xl"
      : text.length < 200
        ? "text-lg"
        : "text-base";

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

  async function post() {
    if (!canPost) return;
    // TODO: save text-only posts once a feed exists; photos go to the gallery
    const at = new Date().toISOString();
    await savePhotos(
      media.map((m) => ({ id: m.id, profileId: profile.id, blob: m.file, kind: m.kind, caption: text.trim(), at })),
    ).catch(() => {});
    setPosted(true);
    setTimeout(onClose, 900);
  }

  const actions = [
    {
      key: "media",
      label: "Upload",
      d: ICONS.media,
      onClick: () => document.getElementById("post-media")?.click(),
    },
    {
      key: "paper",
      label: "Paper",
      d: ICONS.paper,
      onClick: () => setDrawer("paper"),
    },
  ];

  return (
    <section
      className="fixed inset-x-0 top-0 z-50 flex flex-col bg-background"
      style={{
        bottom: keyboard,
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Top navigation */}
      <header className="enter relative mx-4 flex h-12 shrink-0 items-center justify-between border-b border-foreground/15">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Icon d={ICONS.close} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">
          New entry
        </span>
        <button
          type="button"
          onClick={post}
          disabled={!canPost && !posted}
          className="ink-solid h-9 rounded-full px-5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-30"
        >
          {posted ? "Posted ✓" : "Post"}
        </button>
      </header>

      {/* Main canvas */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-4">
        {/* Who's posting */}
        <div
          className="enter flex items-center gap-3"
          style={{ animationDelay: "60ms" }}
        >
          <Avatar profile={profile} className="size-12 rounded-2xl text-xl" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="leading-none font-semibold">{profile.name}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-foreground/30 px-1.5 py-0.5 text-[10px] font-medium tracking-widest uppercase">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* The page */}
        <div
          className={`enter ink-fill flex flex-1 flex-col gap-4 rounded-3xl p-4 transition-[background] ${paper.className}`}
          style={{ animationDelay: "120ms" }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on yo mind?"
            aria-label="Post text"
            className={`field-sizing-content min-h-32 w-full resize-none bg-transparent leading-snug outline-none transition-[font-size] duration-200 placeholder:text-foreground/30 ${textSize}`}
          />
          {media.length > 0 && <Collage media={media} onRemove={remove} />}
        </div>
      </div>

      <input
        id="post-media"
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Attachment drawer */}
      <footer
        className="enter mx-4 mb-3 shrink-0 rounded-2xl border border-foreground/20 bg-background"
        style={{
          animationDelay: "180ms",
          marginBottom:
            keyboard > 0 ? 8 : "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-1">
            {drawer !== "expanded" && (
              <button
                type="button"
                onClick={() => setDrawer("expanded")}
                aria-label="Back"
                className="-ml-2 grid size-8 place-items-center rounded-full"
              >
                <Icon d={ICONS.back} />
              </button>
            )}
            <h2 className="font-semibold">
              {drawer === "paper" ? "Choose paper" : "Add to your post"}
            </h2>
          </div>

          {drawer === "expanded" && (
            <ul className="enter grid grid-cols-2 gap-2">
              {actions.map((a) => (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={a.onClick}
                    className="flex w-full items-center gap-3 rounded-2xl border border-foreground/20 p-4 text-left font-medium transition-transform duration-200 active:scale-[0.97]"
                  >
                    <Icon d={a.d} className="size-6" />
                    <span className="flex-1">{a.label}</span>
                    <Icon d={ICONS.plus} className="size-5 opacity-50" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {drawer === "paper" && (
            <ul className="enter grid grid-cols-4 gap-2">
              {PAPERS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPaper(p)}
                    className={`ink-fill flex aspect-square w-full items-end justify-center rounded-2xl pb-2 text-xs font-medium transition-transform duration-200 active:scale-[0.97] ${p.className} ${
                      paper.id === p.id
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                  >
                    <span className="rounded bg-background px-1">
                      {p.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </footer>
    </section>
  );
}
