import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Pillbox AI",
    short_name: "Pillbox AI",
    description: "Mobile caregiver view for Smart Pillbox AI.",
    start_url: "/mobile",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/globe.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
