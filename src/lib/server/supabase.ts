import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: full access, so it must never reach the browser.
// Every caller is responsible for checking the session first.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local.",
  );
}

export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const BUCKET = "media";

// Tell open screens something changed. Carries no data; clients refetch through actions.
export async function ping() {
  await db
    .channel("ink")
    .httpSend("changed", {})
    .catch(() => {});
}
