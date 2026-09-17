"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { tagsOf, type Photo } from "@/components/photos";
import { Icon } from "@/components/ui";

export type Shown = Photo & { url: string };

const ICONS = {
  back: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  play: "M8 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
  share: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
};

const CHROME = "bg-[color-mix(in_srgb,var(--ink)_4%,var(--paper))]";
const TAP = "transition-colors duration-150 hover:text-[var(--accent)] active:text-[var(--accent)]";

const fmtSize = (b: number) =>
  b < 1024 ** 2 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 ** 2).toFixed(1)} MB`;

export default function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  onDelete,
}: {
  photos: Shown[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const p = photos[index];
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [size, setSize] = useState<{ id: string; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const dims = size?.id === p.id ? size : null;
  const tags = tagsOf(p.caption);
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;

  function go(d: number) {
    const i = index + d;
    if (i < 0 || i >= photos.length) return;
    setZoom(null);
    setMenu(false);
    setConfirm(false);
    onIndex(i);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menu) setMenu(false);
        else onClose();
      }
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, index, photos.length, onIndex, onClose]);

  // Swipe between items; skipped while zoomed so dragging doesn't flip pages
  function down(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
  }
  function up(e: PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || zoom) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
  }

  async function share() {
    setMenu(false);
    const file = new File([p.blob], `ink-${p.id}.${p.blob.type.split("/")[1] ?? "jpg"}`, { type: p.blob.type });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: p.caption }).catch(() => {});
  }

  return (
    // Dimmed backdrop; clicking it closes
    <div
      className="fade-in fixed inset-0 z-[60] flex items-stretch justify-center bg-foreground/30 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Post"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-[var(--ink)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Header */}
        <header className={`relative flex h-12 shrink-0 items-center justify-between border-b border-foreground/15 px-2 ${CHROME}`}>
          <button type="button" onClick={onClose} aria-label="Back" className={`grid size-10 place-items-center rounded-full ${TAP}`}>
            <Icon d={ICONS.back} />
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 font-bold">Post</span>
          <button
            type="button"
            onClick={() => {
              setMenu((m) => !m);
              setConfirm(false);
            }}
            aria-label="Options"
            aria-expanded={menu}
            className={`grid size-10 place-items-center rounded-full ${TAP} ${menu ? "text-[var(--accent)]" : ""}`}
          >
            <Icon d={ICONS.more} className="size-6" />
          </button>

          {menu && (
            <ul className="fade-in absolute top-full right-2 z-10 mt-1 w-44 overflow-hidden rounded-2xl border border-[var(--ink)] bg-[var(--paper)] py-1 text-sm">
              <li>
                <a
                  href={p.url}
                  download={`ink-${p.id}`}
                  onClick={() => setMenu(false)}
                  className={`flex h-10 items-center gap-2.5 px-3 ${TAP}`}
                >
                  <Icon d={ICONS.download} className="size-4" /> Save to device
                </a>
              </li>
              {canShare && (
                <li>
                  <button type="button" onClick={share} className={`flex h-10 w-full items-center gap-2.5 px-3 ${TAP}`}>
                    <Icon d={ICONS.share} className="size-4" /> Share
                  </button>
                </li>
              )}
              <li className="border-t border-foreground/15">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm) return setConfirm(true);
                    setMenu(false);
                    setConfirm(false);
                    onDelete(p.id);
                  }}
                  className={`flex h-10 w-full items-center gap-2.5 px-3 ${TAP} ${confirm ? "font-semibold text-[var(--accent)]" : ""}`}
                >
                  <Icon d={ICONS.trash} className="size-4" /> {confirm ? "Tap again to delete" : "Delete"}
                </button>
              </li>
            </ul>
          )}
        </header>

        {/* Content */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3"
          onPointerDown={down}
          onPointerUp={up}
          onClick={() => setMenu(false)}
        >
          {p.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob
            <img
              key={p.id}
              src={p.url}
              alt={p.caption}
              draggable={false}
              onLoad={(e) => setSize({ id: p.id, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setZoom((z) =>
                  z ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 },
                );
              }}
              style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              className={`fade-in max-h-full max-w-full border border-[var(--ink)] object-contain select-none transition-transform duration-200 ${
                zoom ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
          ) : (
            <Video key={p.id} photo={p} onSize={(w, h) => setSize({ id: p.id, w, h })} />
          )}
        </div>

        {/* Metadata */}
        <div className="flex shrink-0 flex-col gap-1.5 border-t border-foreground/15 px-4 py-3">
          <span className="text-[10px] font-medium tracking-widest text-[var(--gray)] uppercase">
            {new Date(p.at).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {new Date(p.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
          {p.caption && <p className="line-clamp-4 text-[15px] leading-snug break-words">{p.caption}</p>}
          <span className="text-[10px] text-[var(--gray)] tabular-nums">
            {dims && `${dims.w} × ${dims.h} · `}
            {fmtSize(p.blob.size)}
            {tags.length > 0 && ` · ${tags.join(" ")}`}
          </span>
        </div>

        {/* Footer */}
        <footer
          className={`flex shrink-0 items-center justify-between border-t border-foreground/15 px-2 pt-1 ${CHROME}`}
          style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous"
            className={`grid size-11 place-items-center rounded-full disabled:opacity-25 ${TAP}`}
          >
            <Icon d={ICONS.back} />
          </button>
          <button type="button" onClick={onClose} className={`h-9 px-4 text-sm font-semibold ${TAP}`}>
            Close · <span className="font-normal text-[var(--gray)] tabular-nums">{index + 1}/{photos.length}</span>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === photos.length - 1}
            aria-label="Next"
            className={`grid size-11 place-items-center rounded-full disabled:opacity-25 ${TAP}`}
          >
            <Icon d={ICONS.next} />
          </button>
        </footer>
      </div>
    </div>
  );
}

// Minimal controls that fade after 3s of play; tap the video to bring them back
function Video({ photo, onSize }: { photo: Shown; onSize: (w: number, h: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function wake() {
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current?.paused) setShown(false);
    }, 3000);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
    wake();
  }

  return (
    <div className="fade-in relative max-h-full max-w-full border border-[var(--ink)]" onClick={wake}>
      <video
        ref={ref}
        src={photo.url}
        playsInline
        onLoadedMetadata={(e) => onSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => {
          setPlaying(false);
          setShown(true);
        }}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
        className="block max-h-[60dvh] max-w-full"
      />
      <div
        className={`absolute right-2 bottom-2 flex items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--paper)] p-1 pr-2 transition-opacity duration-200 ${
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className={`grid size-8 place-items-center rounded-full ${TAP}`}
        >
          <Icon d={playing ? ICONS.pause : ICONS.play} className="size-4" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          aria-label="Seek"
          onChange={(e) => {
            const v = ref.current;
            if (v?.duration) v.currentTime = Number(e.target.value) * v.duration;
            wake();
          }}
          className="h-1 w-24 accent-[var(--ink)] sm:w-32"
        />
        <button
          type="button"
          onClick={() => ref.current?.requestFullscreen?.()}
          aria-label="Fullscreen"
          className={`grid size-8 place-items-center rounded-full ${TAP}`}
        >
          <Icon d={ICONS.expand} className="size-4" />
        </button>
      </div>
    </div>
  );
}
