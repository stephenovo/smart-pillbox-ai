import {
  HARDWARE_DEVICE_ID,
  SIMULATOR_DEVICE_ID,
} from "./hardwareProtocol";
import type { HardwarePlanSlot, IntegrationMode } from "../types/hardware";
import type { MedicationSchedule, PillboxEventSource } from "../types/pillbox";

export const integrationModes: IntegrationMode[] = [
  "standalone",
  "simulator",
  "hardware",
];

export function isIntegrationMode(value: unknown): value is IntegrationMode {
  return typeof value === "string" && integrationModes.includes(value as IntegrationMode);
}

export function getIntegrationTarget(mode: IntegrationMode): {
  deviceId: string | null;
  source: PillboxEventSource | null;
} {
  if (mode === "simulator") {
    return { deviceId: SIMULATOR_DEVICE_ID, source: "simulation" };
  }

  if (mode === "hardware") {
    return { deviceId: HARDWARE_DEVICE_ID, source: "hardware" };
  }

  return { deviceId: null, source: null };
}

export function hardwarePlanToMedicationSchedule(
  slots: HardwarePlanSlot[]
): MedicationSchedule[] {
  return slots.map((slot) => ({
    compartment: slot.slotId,
    medication: slot.medication,
    scheduledTime: slot.scheduledTime,
    highRisk: slot.highRisk,
    bufferTimeMinutes: slot.bufferTimeMinutes,
  }));
}
