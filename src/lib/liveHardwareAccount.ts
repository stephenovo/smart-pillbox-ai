export const LIVE_HARDWARE_CONNECT_CODE = "20260808";
export const LIVE_HARDWARE_DEVICE_ID = "PILLBOX-20260808";
export const LIVE_HARDWARE_DEVICE_NAME = "Studio hardware pillbox";

export type LiveHardwareAccount = {
  connectCode: string;
  deviceId: string;
  deviceName: string;
  accountType: "physical_hardware";
};

export const LIVE_HARDWARE_ACCOUNT: LiveHardwareAccount = {
  connectCode: LIVE_HARDWARE_CONNECT_CODE,
  deviceId: LIVE_HARDWARE_DEVICE_ID,
  deviceName: LIVE_HARDWARE_DEVICE_NAME,
  accountType: "physical_hardware",
};

export function normalizePillboxConnectCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function resolveLiveHardwareAccount(
  connectCode: string
): LiveHardwareAccount | null {
  return normalizePillboxConnectCode(connectCode) === LIVE_HARDWARE_CONNECT_CODE
    ? LIVE_HARDWARE_ACCOUNT
    : null;
}

export function isLiveHardwareDevice(deviceId: string): boolean {
  return deviceId === LIVE_HARDWARE_DEVICE_ID;
}
