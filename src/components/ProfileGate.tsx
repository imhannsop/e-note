"use client";

import { useCallback, useState } from "react";
import DevLog from "@/components/DevLog";
import Feed from "@/components/Feed";
import Gallery from "@/components/Gallery";
import { getStartup, signOut } from "@/app/actions";
import Notifications from "@/components/Notifications";
import PinPad from "@/components/PinPad";
import PostComposer from "@/components/PostComposer";
import WeeklyPlanner from "@/components/WeeklyPlanner";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { InkStroke, ScreenSplash } from "@/components/Splash";
import { track } from "@/components/loading";
import { clearStartup, seedStartup } from "@/components/startup";
import { Icon } from "@/components/ui";
import type { Startup } from "@/lib/types";

const ARROW = "M7 17L17 7M9 7h8v8";

const ACTIONS = [
  {
    id: "post",
    icon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
    label: "Write a post",
    hint: "Share what's on your mind",
    tile: "col-span-2 ink-solid",
  },
  {
    id: "todo",
    icon: "M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5",
    label: "Dev log",
    hint: "Log your day",
    tile: "ink-dots",
  },
  {
    id: "planner",
    icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
    label: "Weekly Planner",
    hint: "Plan your week",
    tile: "ink-lines",
  },
  {
    id: "gallery",
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
    label: "View Profile",
    hint: "Your posts, likes & comments",
    tile: "col-span-2 ink-grid",
  },
] as const;

export default function ProfileGate({
  signedIn,
  startup,
}: {
  signedIn: string | null;
  startup: Startup | null;
}) {
  useState(() => {
    if (startup && typeof window !== "undefined") seedStartup(startup);
  });
  const [profile, setProfile] = useState<Profile | null>(
    () => PROFILES.find((p) => p.id === signedIn) ?? null,
  );
  const [asking, setAsking] = useState<Profile | null>(null);
  const [picking, setPicking] = useState<Profile | null>(null);
  const [returned, setReturned] = useState(false);
  const [view, setView] = useState<
    "menu" | "post" | "feed" | "todo" | "planner" | "gallery"
  >("menu");
  const [splash, setSplash] = useState(false);
  const hideSplash = useCallback(() => setSplash(false), []);
  const hidePicking = useCallback(() => setPicking(null), []);

  function go(next: typeof view) {
    setView(next);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      setSplash(true);
  }

  function render() {
    function open(p: Profile) {
      setAsking(null);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) setPicking(p);
      track(getStartup())
        .then(seedStartup, () => {})
        .finally(() => setProfile(p));
    }

    if (asking) {
      return (
        <PinPad
          profile={asking}
          onBack={() => setAsking(null)}
          onSuccess={() => open(asking)}
        />
      );
    }

    if (profile && view === "post") {
      return <PostComposer profile={profile} onClose={() => setView("menu")} />;
    }

    if (profile && view === "feed") {
      return (
        <Feed
          profile={profile}
          onClose={() => setView("menu")}
          onWrite={() => setView("post")}
        />
      );
    }

    if (profile && view === "gallery") {
      return <Gallery profile={profile} onClose={() => setView("menu")} />;
    }

    if (profile && view === "planner") {
      return (
        <WeeklyPlanner profile={profile} onClose={() => setView("menu")} />
      );
    }

    if (profile && view === "todo") {
      return <DevLog profile={profile} onClose={() => setView("menu")} />;
    }

    if (profile) {
      const today = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      return (
        <section className="flex w-full flex-1 flex-col gap-6 sm:gap-8">
          <header className="enter flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
                {today}
              </span>
              <div className="flex items-center gap-2">
                <Notifications
                  profile={profile}
                  onOpenFeed={() => setView("feed")}
                />
                <button
                  type="button"
                  onClick={async () => {
                    await signOut().catch(() => {});
                    clearStartup();
                    setReturned(true);
                    setView("menu");
                    setProfile(null);
                  }}
                  className="flex items-center gap-2 rounded-full border border-foreground/20 py-1 pr-3 pl-1 text-xs font-medium"
                >
                  <Avatar
                    profile={profile}
                    className="size-6 rounded-full text-xs"
                  />
                  Switch
                </button>
              </div>
            </div>
            <h1 className="text-6xl leading-[0.95] font-semibold tracking-tighter break-words sm:text-7xl">
              Hello,
              <br />
              <span className="text-7xl">{profile.name}</span> !
            </h1>
            <p className="mt-2 text-2xl text-foreground/50 sm:text-xl">
              What will you do today?
            </p>
          </header>

          <div className="grid min-h-96 flex-1 grid-cols-2 grid-rows-[1.6fr_1fr_0.8fr] gap-3">
            {ACTIONS.map(({ id, icon, label, hint, tile }, i) => (
              <div
                key={id}
                style={{ animationDelay: `${150 + i * 70}ms` }}
                className={`enter relative ${tile.includes("col-span-2") ? "col-span-2" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => go(id)}
                  className={`group relative flex size-full flex-col justify-between overflow-hidden ink-fill rounded-3xl p-4 text-left transition-transform duration-200 active:scale-[0.97] sm:p-5 ${tile}`}
                >
                  {}
                  {id !== "post" && (
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background from-35% to-transparent"
                      aria-hidden
                    />
                  )}
                  <span className="relative flex items-start justify-between">
                    <span className="text-xs font-medium tabular-nums opacity-50">
                      0{i + 1}
                    </span>
                    <span
                      className={`relative grid size-11 place-items-center rounded-full border-[1.5px] border-current transition-transform duration-300 group-hover:-rotate-12 ${id === "post" ? "" : "bg-background"}`}
                    >
                      <Icon
                        d={icon}
                        className="size-5 transition-all duration-300 group-hover:scale-50 group-hover:opacity-0"
                      />
                      <Icon
                        d={ARROW}
                        className="absolute size-5 scale-50 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:rotate-12 group-hover:opacity-100"
                      />
                    </span>
                  </span>
                  <span className="relative flex flex-col">
                    <span
                      className={`font-semibold tracking-tight ${i === 0 ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"}`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-sm opacity-60 ${id === "post" ? "pr-28" : ""}`}
                    >
                      {hint}
                    </span>
                  </span>
                </button>
                {id === "post" && (
                  <button
                    type="button"
                    onClick={() => go("feed")}
                    className="absolute right-4 bottom-4 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-transform duration-200 active:scale-[0.97] sm:right-5 sm:bottom-5"
                  >
                    Go to feed →
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section
        style={returned ? { animationDelay: "0s" } : undefined}
        className="rise m-auto flex w-full max-w-xl flex-col gap-8 sm:gap-10"
      >
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
            ink · a notebook for two
          </span>
          <h1 className="text-5xl leading-[0.95] font-semibold tracking-tighter sm:text-6xl">
            Who are yew?
          </h1>
          <InkStroke className="mt-1 w-28 sm:w-32" />
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {PROFILES.map((p, i) => (
            <li
              key={p.id}
              style={{ animationDelay: `${(returned ? 0 : 1600) + 150 + i * 90}ms` }}
              className="enter"
            >
              <button
                type="button"
                onClick={() => setAsking(p)}
                aria-label={`Open ${p.name}'s notebook`}
                className={`group ink-fill relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition-transform duration-300 active:scale-[0.97] sm:p-5 ${i % 2 ? "ink-dots hover:rotate-1" : "ink-lines hover:-rotate-1"}`}
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-2.5 border-r-[1.5px] border-foreground bg-foreground/10"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background from-30% to-transparent"
                  aria-hidden
                />

                <span className="relative flex items-start justify-between pl-2">
                  <span className="text-xs font-medium tabular-nums opacity-50">
                    0{i + 1}
                  </span>
                  <span className="grid size-9 place-items-center rounded-full border-[1.5px] border-current bg-background transition-transform duration-300 group-hover:-rotate-12">
                    <Icon
                      d="M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v2"
                      className="size-4 transition-all duration-300 group-hover:scale-50 group-hover:opacity-0"
                    />
                    <Icon
                      d={ARROW}
                      className="absolute size-4 scale-50 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:rotate-12 group-hover:opacity-100"
                    />
                  </span>
                </span>

                <span
                  className={`relative mx-auto transition-transform duration-300 group-hover:rotate-0 ${i % 2 ? "rotate-3" : "-rotate-3"}`}
                >
                  <span className="block rounded-xl border-[1.5px] border-foreground bg-background p-1.5 pb-4">
                    <Avatar
                      profile={p}
                      className="size-20 rounded-lg text-3xl sm:size-28 sm:text-5xl"
                    />
                  </span>
                  <span
                    className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-2 bg-foreground/15"
                    aria-hidden
                  />
                </span>

                <span className="relative flex flex-col pl-2">
                  <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {p.name}
                  </span>
                  <span className="text-xs opacity-60 sm:text-sm">
                    Tap to unlock
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      {render()}
      {splash && <ScreenSplash onDone={hideSplash} />}
      {picking && (
        <ScreenSplash onDone={hidePicking}>
          <Avatar
            profile={picking}
            className="enter size-24 rounded-3xl text-4xl sm:size-28 sm:text-5xl"
          />
          <span className="order-last text-xs font-medium tracking-[0.3em] text-foreground/50 uppercase">
            Opening {picking.name}&apos;s notebook
          </span>
        </ScreenSplash>
      )}
    </>
  );
}
