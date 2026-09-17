// Fixed sign-in profiles.
export const PROFILE_IDS = ["sop", "ling"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];
