import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PROFILE_IDS, type ProfileId } from "@/lib/profiles";

const COOKIE = "ink_session";
const MAX_AGE = 30 * 24 * 60 * 60; 

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "SESSION_SECRET must be set (32+ chars). See .env.example.",
    );
  return new TextEncoder().encode(secret);
}

export async function createSession(profileId: ProfileId) {
  const token = await new SignJWT({ sub: profileId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentProfile(): Promise<ProfileId | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    return PROFILE_IDS.includes(payload.sub as ProfileId)
      ? (payload.sub as ProfileId)
      : null;
  } catch {
    return null;
  }
}

export async function requireProfile(): Promise<ProfileId> {
  const id = await currentProfile();
  if (!id) throw new Error("Not signed in");
  return id;
}
