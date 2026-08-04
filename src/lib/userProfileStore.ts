import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_USER_PROFILE } from "./userProfile";
import type { UserProfile } from "../types/profile";

type UserProfileUpdate = Pick<
  UserProfile,
  "fullName" | "email" | "phone" | "role"
>;

type ValidationResult =
  | { ok: true; profile: UserProfileUpdate }
  | { ok: false; error: string };

const storeDirectoryPath = join(process.cwd(), ".data");
const storeFilePath = join(storeDirectoryPath, "user-profile.json");

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Partial<UserProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.fullName === "string" &&
    typeof profile.email === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.role === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function loadPersistedProfile(): UserProfile {
  try {
    const profile = JSON.parse(readFileSync(storeFilePath, "utf8")) as unknown;
    return isUserProfile(profile) ? profile : DEFAULT_USER_PROFILE;
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

const globalProfileStore = globalThis as typeof globalThis & {
  __smartPillboxUserProfileStore?: { profile: UserProfile };
};

const store =
  globalProfileStore.__smartPillboxUserProfileStore ??
  (globalProfileStore.__smartPillboxUserProfileStore = {
    profile: loadPersistedProfile(),
  });

function persistProfile(): void {
  try {
    mkdirSync(storeDirectoryPath, { recursive: true });
    const temporaryPath = `${storeFilePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(store.profile), "utf8");
    renameSync(temporaryPath, storeFilePath);
  } catch {
    // The profile remains available in memory if the runtime is read-only.
  }
}

export function getUserProfile(): UserProfile {
  return { ...store.profile };
}

export function setUserProfile(update: UserProfileUpdate): UserProfile {
  store.profile = {
    ...store.profile,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  persistProfile();
  return getUserProfile();
}

export function validateUserProfileUpdate(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Profile details are required." };
  }

  const candidate = body as Record<string, unknown>;
  const fullName =
    typeof candidate.fullName === "string" ? candidate.fullName.trim() : "";
  const role = typeof candidate.role === "string" ? candidate.role.trim() : "";
  const email =
    typeof candidate.email === "string" ? candidate.email.trim() : "";
  const phone =
    typeof candidate.phone === "string" ? candidate.phone.trim() : "";

  if (!fullName) {
    return { ok: false, error: "Enter your full name." };
  }
  if (fullName.length > 80) {
    return { ok: false, error: "Full name must be 80 characters or fewer." };
  }
  if (!role) {
    return { ok: false, error: "Enter your caregiver role." };
  }
  if (role.length > 80) {
    return { ok: false, error: "Caregiver role must be 80 characters or fewer." };
  }
  if (email.length > 160) {
    return { ok: false, error: "Email must be 160 characters or fewer." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (phone.length > 40) {
    return { ok: false, error: "Phone number must be 40 characters or fewer." };
  }

  return {
    ok: true,
    profile: { fullName, role, email, phone },
  };
}
