export const HARDWARE_DEMO_SLOT_IDS = [1, 2] as const;
export const HARDWARE_DEMO_SLOT_ID = HARDWARE_DEMO_SLOT_IDS[0];

export type HardwareDemoSlotId = (typeof HARDWARE_DEMO_SLOT_IDS)[number];

export function isHardwareDemoSlot(
  slotId: number | null | undefined
): slotId is HardwareDemoSlotId {
  return HARDWARE_DEMO_SLOT_IDS.some((demoSlotId) => demoSlotId === slotId);
}
