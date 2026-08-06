import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Pillbox",
    short_name: "Pillbox",
    description: "Mobile caregiver view for Smart Pillbox.",
    start_url: "/mobile",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/brand-icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
