export type AppMode = "circle-care" | "my-care";

export const APP_MODE_STORAGE_KEY = "smart-pillbox-app-mode";

export const appModeDetails: Record<
  AppMode,
  { label: string; shortDescription: string; description: string }
> = {
  "circle-care": {
    label: "Circle Care",
    shortDescription: "Care for family",
    description:
      "A complete view for family members and caregivers looking after others.",
  },
  "my-care": {
    label: "My Care",
    shortDescription: "Care for myself",
    description:
      "A calmer, larger and simpler view for managing your own medicines.",
  },
};

export function isAppMode(value: string | null): value is AppMode {
  return value === "circle-care" || value === "my-care";
}
