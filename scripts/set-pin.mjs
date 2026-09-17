// Sets (or resets) a profile's 4-digit PIN. Runs locally with your service-role key;
// only the bcrypt hash is stored.
//
//   npm run set-pin -- sop
//
// You'll be prompted for the PIN, so it never lands in your shell history.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const PROFILES = ["sop", "ling"];
const id = process.argv[2];
if (!PROFILES.includes(id)) {
  console.error(`Usage: npm run set-pin -- <${PROFILES.join("|")}>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase settings. Fill in .env.local first (see .env.example).");
  process.exit(1);
}

// Hide typed digits
const rl = createInterface({ input: stdin, output: stdout, terminal: true });
rl._writeToOutput = (s) => rl.output.write(/\d/.test(s) ? "" : s);
const pin = (await rl.question(`New 4-digit PIN for ${id}: `)).trim();
const again = (await rl.question("\nRepeat it: ")).trim();
rl.close();
console.log();

if (!/^\d{4}$/.test(pin)) {
  console.error("PIN must be exactly 4 digits.");
  process.exit(1);
}
if (pin !== again) {
  console.error("PINs didn't match.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db
  .from("profiles")
  .update({ pin_hash: await bcrypt.hash(pin, 12), failed_attempts: 0, locked_until: null })
  .eq("id", id);
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`PIN set for ${id}.`);
