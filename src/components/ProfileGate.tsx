"use client";

import { useState } from "react";
import DevLog from "@/components/DevLog";
import Feed from "@/components/Feed";
import Gallery from "@/components/Gallery";
import PostComposer from "@/components/PostComposer";
import WeeklyPlanner from "@/components/WeeklyPlanner";
import { Avatar, PROFILES, type Profile } from "@/components/profiles";
import { InkStroke } from "@/components/Splash";

// Main tile layout for the home screen
const ACTIONS = [
  {
    id: "post",
    icon: "✍️",
    label: "Write a post",
    hint: "Share what's on your mind",
    tile: "col-span-2 ink-solid",
  },
  {
    id: "todo",
    icon: "✅",
    label: "Dev log",
    hint: "Log your day",
    tile: "ink-dots",
  },
  {
    id: "planner",
    icon: "🗓️",
    label: "Weekly Planner",
    hint: "Plan your week",
    tile: "ink-lines",
  },
  {
    id: "gallery",
    icon: "🖼️",
    label: "View Gallery",
    hint: "Browse your posts",
    tile: "col-span-2 ink-grid",
  },
] as const;

export default function ProfileGate() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Profile tapped, showing its loading screen
  const [picking, setPicking] = useState<Profile | null>(null);
  // Came back via Switch, so the picker shouldn't wait for the splash
  const [returned, setReturned] = useState(false);
  // Which screen of the profile's space is open
  const [view, setView] = useState<
    "menu" | "post" | "feed" | "todo" | "planner" | "gallery"
  >("menu");

  function choose(p: Profile) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProfile(p);
      return;
    }
    setPicking(p);
    // Long enough for the ink stroke to finish writing
    setTimeout(() => {
      setProfile(p);
      setPicking(null);
    }, 1500);
  }

  if (picking) {
    return (
      <section
        role="status"
        aria-label={`Opening ${picking.name}`}
        className="enter m-auto flex flex-col items-center gap-6"
      >
        <Avatar
          profile={picking}
          className="size-24 rounded-3xl text-4xl sm:size-28 sm:text-5xl"
        />
        <InkStroke className="w-32 sm:w-40" />
        <span className="text-xs font-medium tracking-[0.3em] text-foreground/50 uppercase">
          Opening {picking.name}&apos;s notebook
        </span>
      </section>
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
    return <WeeklyPlanner profile={profile} onClose={() => setView("menu")} />;
  }

  if (profile && view === "todo") {
    return <DevLog profile={profile} onClose={() => setView("menu")} />;
  }

  if (profile) {
    const today = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <section className="flex w-full flex-1 flex-col gap-6 sm:gap-8">
        <header className="enter flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium tracking-[0.3em] text-foreground/40 uppercase">
              {today}
            </span>
            <button
              type="button"
              onClick={() => {
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
                onClick={() => setView(id)}
                className={`group relative flex size-full flex-col justify-end overflow-hidden ink-fill rounded-3xl p-5 text-left transition-transform duration-200 active:scale-[0.97] ${tile}`}
              >
                <span
                  className="absolute -top-3 -right-3 text-8xl opacity-20 grayscale transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 sm:text-9xl"
                  aria-hidden
                >
                  {icon}
                </span>
                <span className="absolute top-4 left-5 text-xs font-medium tabular-nums opacity-50">
                  0{i + 1}
                </span>
                <span
                  className={`font-semibold tracking-tight ${i === 0 ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"}`}
                >
                  {label}
                </span>
                <span className="text-sm opacity-60">{hint}</span>
              </button>
              {id === "post" && (
                <button
                  type="button"
                  onClick={() => setView("feed")}
                  className="absolute top-3 right-3 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-transform duration-200 active:scale-[0.97]"
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
      className="rise m-auto flex w-full flex-col items-center gap-10 text-center sm:gap-14"
    >
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        Who&apos;s there?
      </h1>

      <ul className="flex flex-wrap justify-center gap-8 sm:gap-12">
        {PROFILES.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => choose(p)}
              className="group flex flex-col items-center gap-3 transition-transform duration-200 active:scale-[0.97]"
            >
              <Avatar
                profile={p}
                className="size-28 rounded-3xl text-5xl ring-foreground ring-offset-4 ring-offset-background transition-all duration-200 group-hover:ring-2 group-focus-visible:ring-2 sm:size-40 sm:text-6xl"
              />
              <span className="text-lg text-foreground/60 transition-colors group-hover:text-foreground sm:text-xl">
                {p.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
