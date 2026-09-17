// Per-device post store. Swap these functions for API calls once a database exists;
// the feed only talks to this module. Media blobs stay in photos.ts, referenced by id.
export type Post = {
  id: string;
  profileId: string;
  text: string;
  paper: string; // tile texture class, "" for plain
  tags?: string[]; // mood tags picked in the composer
  mediaIds: string[];
  // Direct media links, used by the sample posts (and later by database URLs)
  mediaUrls?: { kind: "image" | "video"; url: string }[];
  at: string; // ISO time posted
};

const KEY = "ink:posts";
const CHANNEL = "ink:posts";

function read(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

// Placeholder posts so the feed has something to show before anyone posts.
// They disappear once a real post is saved. Remove when the database is connected.
const ago = (hours: number) =>
  new Date(Date.now() - hours * 3_600_000).toISOString();
const pic = (seed: string) => ({
  kind: "image" as const,
  url: `https://picsum.photos/seed/${seed}/600/600`,
});
const SAMPLE_POSTS: Post[] = [
  {
    id: "sample-1",
    profileId: "sop",
    text: "First morning on the new notebook ☕",
    paper: "",
    mediaIds: [],
    mediaUrls: [pic("ink-coffee")],
    at: ago(1),
  },
  {
    id: "sample-2",
    profileId: "ling",
    text: "Planner is filled in for the week. #goals",
    paper: "ink-lines",
    mediaIds: [],
    at: ago(3),
  },
  {
    id: "sample-3",
    profileId: "sop",
    text: "Shipped the gallery today. Next up: the feed, then syncing it all to a real database.",
    paper: "ink-dots",
    mediaIds: [],
    mediaUrls: [pic("ink-desk"), pic("ink-code"), pic("ink-city")],
    at: ago(20),
  },
  {
    id: "sample-4",
    profileId: "ling",
    text: "hello from ling 👋",
    paper: "ink-grid",
    mediaIds: [],
    mediaUrls: [pic("ink-park"), pic("ink-sky")],
    at: ago(46),
  },
];

export function listPosts(): Post[] {
  const posts = read();
  return (posts.length ? posts : SAMPLE_POSTS).sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}

// Broadcast so other open tabs reload too
function notify() {
  const ch = new BroadcastChannel(CHANNEL);
  ch.postMessage("changed");
  ch.close();
}

export function savePost(post: Post) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...read(), post]));
    notify();
  } catch {}
}

// Likes and comments, keyed by post id so they work on sample posts too
export type Comment = {
  id: string;
  profileId: string;
  text: string;
  at: string;
};
export type Reactions = {
  likes: Record<string, string[]>; // post id -> profile ids
  comments: Record<string, Comment[]>;
  likedAt?: Record<string, Record<string, string>>; // post id -> profile id -> ISO time
};

const REACTIONS_KEY = "ink:reactions";

export function readReactions(): Reactions {
  try {
    return {
      likes: {},
      comments: {},
      ...JSON.parse(localStorage.getItem(REACTIONS_KEY) ?? "{}"),
    };
  } catch {
    return { likes: {}, comments: {} };
  }
}

function writeReactions(r: Reactions) {
  try {
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(r));
    notify();
  } catch {}
}

export function toggleLike(postId: string, profileId: string) {
  const r = readReactions();
  const likes = r.likes[postId] ?? [];
  const liked = likes.includes(profileId);
  r.likes[postId] = liked
    ? likes.filter((id) => id !== profileId)
    : [...likes, profileId];
  // Remember when, so notifications can be ordered
  const times = ((r.likedAt ??= {})[postId] ??= {});
  if (liked) delete times[profileId];
  else times[profileId] = new Date().toISOString();
  writeReactions(r);
}

export function addComment(postId: string, profileId: string, text: string) {
  const r = readReactions();
  const comment = {
    id: crypto.randomUUID(),
    profileId,
    text,
    at: new Date().toISOString(),
  };
  r.comments[postId] = [...(r.comments[postId] ?? []), comment];
  writeReactions(r);
}

export function deleteComment(postId: string, commentId: string) {
  const r = readReactions();
  r.comments[postId] = (r.comments[postId] ?? []).filter(
    (c) => c.id !== commentId,
  );
  writeReactions(r);
}

// Calls back whenever posts change, in this tab or another one
export function subscribePosts(onChange: () => void) {
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = onChange;
  const onStorage = (e: StorageEvent) =>
    (e.key === KEY || e.key === REACTIONS_KEY) && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    ch.close();
    window.removeEventListener("storage", onStorage);
  };
}

// Removes the post and its likes/comments; the caller removes its stored media
export function deletePost(postId: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(read().filter((p) => p.id !== postId)),
    );
    const r = readReactions();
    delete r.likes[postId];
    delete r.comments[postId];
    delete r.likedAt?.[postId];
    writeReactions(r);
  } catch {}
}
