import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fable by TABOOST",
    short_name: "Fable",
    description: "Professional cross-posting for creators.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#FF005C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
