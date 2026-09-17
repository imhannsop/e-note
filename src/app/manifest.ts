import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest and linked in <head> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ink",
    short_name: "ink",
    description: "A quiet, paper-like shared notebook for two.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eeede7",
    theme_color: "#eeede7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
