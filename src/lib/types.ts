// Shapes passed between server actions and client components
export type MediaKind = "image" | "video";

export type FeedMedia = { id: string; kind: MediaKind; url: string };

export type FeedPost = {
  id: string;
  profileId: string;
  text: string;
  tags: string[];
  media: FeedMedia[];
  at: string;
};

export type Like = { postId: string; profileId: string; at: string };

export type Comment = {
  id: string;
  postId: string;
  profileId: string;
  text: string;
  at: string;
};

export type Feed = { posts: FeedPost[]; likes: Like[]; comments: Comment[] };

export type ProfileMeta = { name: string; bio: string };

export type UploadSlot = { path: string; token: string };
