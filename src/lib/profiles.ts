// Shared by server and client: the fixed set of people who can sign in
export const PROFILE_IDS = ["sop", "ling"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];
