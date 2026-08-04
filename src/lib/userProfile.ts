import type { UserProfile } from "../types/profile";

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "primary-caregiver",
  fullName: "Sarah Chen",
  email: "sarah.chen@example.com",
  phone: "+852 5555 0108",
  role: "Family caregiver",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export function profileFirstName(profile: UserProfile): string {
  return profile.fullName.trim().split(/\s+/)[0] || profile.fullName;
}

export function profileInitials(profile: UserProfile): string {
  const words = profile.fullName.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return profile.fullName.trim().slice(0, 2).toUpperCase() || "ME";
}
