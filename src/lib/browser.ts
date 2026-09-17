"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public (anon) client. It can't read any table (RLS denies everything); it's only
// used for the realtime "changed" ping and for uploading to server-signed upload URLs.
let client: SupabaseClient | null = null;

export function browserDb() {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return client;
}

// Calls back whenever any device changes shared data
export function subscribeChanges(onChange: () => void) {
  const channel = browserDb()
    .channel("ink")
    .on("broadcast", { event: "changed" }, onChange)
    .subscribe();
  return () => {
    browserDb().removeChannel(channel);
  };
}
