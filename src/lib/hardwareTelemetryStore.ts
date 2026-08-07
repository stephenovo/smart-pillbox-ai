import type {
  HardwareTelemetry,
  HardwareTelemetryPayload,
} from "../types/hardwareTelemetry";

const globalTelemetryStore = globalThis as typeof globalThis & {
  __smartPillboxTelemetryStore?: Map<string, HardwareTelemetry>;
};

const telemetryStore =
  globalTelemetryStore.__smartPillboxTelemetryStore ??
  (globalTelemetryStore.__smartPillboxTelemetryStore = new Map());

export function getHardwareTelemetry(
  deviceId: string
): HardwareTelemetry | null {
  const telemetry = telemetryStore.get(deviceId);
  return telemetry ? { ...telemetry } : null;
}

export function setHardwareTelemetry(
  payload: HardwareTelemetryPayload
): HardwareTelemetry {
  const now = new Date().toISOString();
  const telemetry: HardwareTelemetry = {
    ...payload,
    reportedAt: payload.reportedAt ?? now,
    receivedAt: now,
  };

  telemetryStore.set(payload.deviceId, telemetry);
  return { ...telemetry };
}
