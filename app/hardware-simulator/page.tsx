import type { Metadata } from "next";

import HardwareSimulator from "./HardwareSimulator";

export const metadata: Metadata = {
  title: "Pillbox Hardware Simulator",
  description: "A browser-based simulator for the smart pillbox hardware.",
};

export default function HardwareSimulatorPage() {
  return <HardwareSimulator />;
}
