export type HardwareTelemetry = {
  deviceId: string;
  firmwareVersion: string;
  ipAddress: string;
  wifiRssi: number;
  uptimeMs: number;
  freeHeapBytes: number;
  uploadQueueDepth: number;
  reminderActive: boolean;
  activeSlot: number | null;
  reportedAt: string;
  receivedAt: string;
};

export type HardwareTelemetryApiResponse = {
  deviceId: string;
  telemetry: HardwareTelemetry | null;
  serverTime: string;
};

export type HardwareTelemetryPayload = Omit<
  HardwareTelemetry,
  "reportedAt" | "receivedAt"
> & {
  reportedAt?: string;
};
