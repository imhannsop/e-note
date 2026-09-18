"use client";

import Image from "next/image";
import { useState } from "react";

export const PROFILES = [
  { id: "sop", name: "sop", photo: "/images/sop.png", focus: "50% 50%" },
  { id: "ling", name: "ling", photo: "/images/ling.jpg", focus: "50% 50%" },
];

export type Profile = (typeof PROFILES)[number];

export function Avatar({ profile, className = "" }: { profile: Profile; className?: string }) {
  const [broken, setBroken] = useState(false);

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden bg-foreground font-semibold text-background uppercase ${className}`}
    >
      {profile.name[0]}
      {profile.photo && !broken && (
        <Image
          src={profile.photo}
          alt=""
          fill
          sizes="160px"
          className="object-cover grayscale"
          style={{ objectPosition: profile.focus }}
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}
