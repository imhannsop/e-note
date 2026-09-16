"use client";

import Image from "next/image";
import { useState } from "react";

// Drop photos at public/profiles/<id>.jpg; the initial shows until then
const PROFILES = [
  { id: "sop", name: "sop" },
  { id: "ling", name: "ling" },
];

type Profile = (typeof PROFILES)[number];

// Main tile layout for the home screen
const ACTIONS = [
  { icon: "✍️", label: "Write a post", hint: "Share what's on your mind", tile: "col-span-2 ink-solid" },
  { icon: "✅", label: "To-do list", hint: "Plan your day", tile: "ink-dots" },
  { icon: "🗓️", label: "Weekly Planner", hint: "Plan your week", tile: "ink-lines" },
  { icon: "🖼️", label: "View Gallery", hint: "Browse your posts", tile: "col-span-2 ink-grid" },
];

function Avatar({ profile, className = "" }: { profile: Profile; className?: string }) {
  const [broken, setBroken] = useState(false);

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden bg-foreground font-semibold text-background uppercase ${className}`}
    >
      {profile.name[0]}
      {!broken && (
        <Image
          src={`/profiles/${profile.id}.jpg`}
          alt=""
          fill
          sizes="160px"
          className="object-cover grayscale"
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}

export default function ProfileGate() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Profile tapped but picker still animating out
  const [picking, setPicking] = useState<Profile | null>(null);
  // Came back via Switch, so the picker shouldn't wait for the splash
  const [returned, setReturned] = useState(false);

  function choose(p: Profile) {
    if (picking) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProfile(p);
      return;
    }
    setPicking(p);
    setTimeout(() => {
      setProfile(p);
      setPicking(null);
    }, 450);
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
                setProfile(null);
              }}
              className="flex items-center gap-2 rounded-full border border-foreground/20 py-1 pr-3 pl-1 text-xs font-medium"
            >
              <Avatar profile={profile} className="size-6 rounded-full text-xs" />
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
          {ACTIONS.map(({ icon, label, hint, tile }, i) => (
            <button
              key={label}
              type="button"
              style={{ animationDelay: `${150 + i * 70}ms` }}
              className={`enter group relative flex flex-col justify-end overflow-hidden ink-fill rounded-3xl p-5 text-left transition-transform duration-200 active:scale-[0.97] ${tile}`}
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
              <span className={`font-semibold tracking-tight ${i === 0 ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"}`}>
                {label}
              </span>
              <span className="text-sm opacity-60">{hint}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      style={returned ? { animationDelay: "0s" } : undefined}
      className={`rise m-auto flex w-full flex-col items-center gap-10 text-center transition-opacity delay-150 duration-300 sm:gap-14 ${
        picking ? "opacity-0" : ""
      }`}
    >
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Who&apos;s there?</h1>

      <ul className="flex flex-wrap justify-center gap-8 sm:gap-12">
        {PROFILES.map((p) => (
          <li
            key={p.id}
            className={`transition-all duration-300 ease-out ${
              !picking ? "" : picking === p ? "scale-110" : "scale-90 opacity-0"
            }`}
          >
            <button
              type="button"
              disabled={!!picking}
              onClick={() => choose(p)}
              className="group flex flex-col items-center gap-3"
            >
              <Avatar
                profile={p}
                className="size-28 rounded-3xl text-5xl ring-foreground ring-offset-4 ring-offset-background transition-all duration-200 group-hover:ring-2 group-focus-visible:ring-2 group-active:scale-95 sm:size-40 sm:text-6xl"
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
