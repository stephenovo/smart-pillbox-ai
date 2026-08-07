import type { Metadata } from "next";

import StudioConsole from "./StudioConsole";

export const metadata: Metadata = {
  title: "Device Studio | Smart Pillbox",
  description: "Live operations and diagnostics for a connected Smart Pillbox.",
};

export default function StudioPage() {
  return <StudioConsole />;
}
