"use client";

import { seedNotifSeen } from "@/components/Notifications";
import { seedFeed } from "@/components/posts";
import { clearDocs, seedDoc } from "@/components/useDoc";
import type { Startup } from "@/lib/types";

export function seedStartup(data: Startup) {
  seedFeed(data.feed);
  seedNotifSeen(data.notifSeen);
  seedDoc("devlog", data.docs.devlog);
  seedDoc("planner", data.docs.planner);
  seedDoc("budget", data.docs.budget);
}

export function clearStartup() {
  seedNotifSeen(null);
  clearDocs();
}
