// Per-device photo store. Blobs are too big for localStorage, so this uses IndexedDB.
export type Photo = {
  id: string;
  profileId: string;
  blob: Blob;
  kind: "image" | "video";
  caption: string;
  at: string; // ISO time posted
};

const DB = "ink";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("profileId", "profileId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req ? req.result : undefined);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPhotos(profileId: string): Promise<Photo[]> {
  const rows = await run<Photo[]>("readonly", (s) => s.index("profileId").getAll(profileId));
  return rows ?? [];
}

export function savePhotos(photos: Photo[]) {
  return run("readwrite", (s) => {
    photos.forEach((p) => s.put(p));
  });
}

export function deletePhoto(id: string) {
  return run("readwrite", (s) => {
    s.delete(id);
  });
}

// #hashtags in a caption double as tags
export const tagsOf = (caption: string) => [...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) ?? [])].map((t) => t.toLowerCase());
