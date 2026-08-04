"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  LoaderCircle,
  Moon,
  Pencil,
  Save,
  Smartphone,
  SunMoon,
  UserRound,
  X,
} from "lucide-react";

import { profileInitials } from "../lib/userProfile";
import AppModeSwitcher from "./AppModeSwitcher";
import { appModeDetails, type AppMode } from "../lib/appMode";
import type { UserProfile, UserProfileApiResponse } from "../types/profile";

const THEME_STORAGE_KEY = "smart-pillbox-theme";

type ToggleRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

type SettingsPanelProps = {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

type ProfileDraft = Pick<
  UserProfile,
  "fullName" | "email" | "phone" | "role"
>;

function profileDraft(profile: UserProfile): ProfileDraft {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
  };
}

function ToggleRow({ label, description, enabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-soft">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-mint" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-toggle-knob shadow-card transition-all ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel({
  profile,
  onProfileChange,
  mode,
  onModeChange,
}: SettingsPanelProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [missedDoseAlerts, setMissedDoseAlerts] = useState(true);
  const [lateDoseAlerts, setLateDoseAlerts] = useState(true);
  const [deviceOfflineAlerts, setDeviceOfflineAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileDraft>(() =>
    profileDraft(profile)
  );
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDarkMode(document.documentElement.dataset.theme === "dark");
    });

    function syncThemeAcrossTabs(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const isDark = event.newValue === "dark";
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      setDarkMode(isDark);
    }

    window.addEventListener("storage", syncThemeAcrossTabs);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", syncThemeAcrossTabs);
    };
  }, []);

  function handleDarkModeChange(enabled: boolean) {
    const theme = enabled ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    setDarkMode(enabled);
  }

  function updateProfileField(field: keyof ProfileDraft, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function cancelProfileEditing() {
    setProfileForm(profileDraft(profile));
    setProfileError(null);
    setIsEditingProfile(false);
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const body = (await response.json()) as
        | UserProfileApiResponse
        | { error?: string };

      if (!response.ok || !("profile" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Your profile could not be updated."
        );
      }

      onProfileChange(body.profile);
      setProfileForm(profileDraft(body.profile));
      setProfileMessage("Profile updated and ready to sync with your iPhone.");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Your profile could not be updated."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className={`space-y-6 ${mode === "my-care" ? "my-care-settings" : ""}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-coral-ink">
          Your preferences
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          Settings
        </h1>
      </div>

      <section className="rounded-lg border border-coral-line bg-coral-soft p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-coral-ink">
              How you use Smart Pillbox
            </p>
            <h2 className="mt-1 text-xl font-bold text-ink">
              {appModeDetails[mode].label}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {appModeDetails[mode].description}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <AppModeSwitcher mode={mode} onChange={onModeChange} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-soft text-sm font-bold text-mint-ink">
            {profileInitials(profile)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-ink">{profile.fullName}</h2>
            <p className="truncate text-sm text-ink-soft">
              {mode === "my-care"
                ? "Your personal medicine plan"
                : `${profile.role} · Looking after 3 people`}
            </p>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => {
                setProfileForm(profileDraft(profile));
                setProfileError(null);
                setProfileMessage(null);
                setIsEditingProfile(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cream-deep"
            >
              <Pencil aria-hidden="true" size={15} />
              Edit profile
            </button>
          )}
        </div>

        {isEditingProfile && (
          <form
            className="mt-6 border-t border-line pt-5"
            onSubmit={handleProfileSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-ink">
                Full name
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(event) =>
                    updateProfileField("fullName", event.target.value)
                  }
                  autoComplete="name"
                  maxLength={80}
                  required
                  className="w-full rounded-lg border border-line bg-cream px-3.5 py-2.5 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-mint focus:ring-2 focus:ring-mint-soft"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-ink">
                {mode === "my-care" ? "How you use the app" : "Caregiver role"}
                <input
                  type="text"
                  value={profileForm.role}
                  onChange={(event) =>
                    updateProfileField("role", event.target.value)
                  }
                  autoComplete="organization-title"
                  maxLength={80}
                  required
                  className="w-full rounded-lg border border-line bg-cream px-3.5 py-2.5 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-mint focus:ring-2 focus:ring-mint-soft"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-ink">
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    updateProfileField("email", event.target.value)
                  }
                  autoComplete="email"
                  maxLength={160}
                  className="w-full rounded-lg border border-line bg-cream px-3.5 py-2.5 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-mint focus:ring-2 focus:ring-mint-soft"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-ink">
                Phone
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    updateProfileField("phone", event.target.value)
                  }
                  autoComplete="tel"
                  maxLength={40}
                  className="w-full rounded-lg border border-line bg-cream px-3.5 py-2.5 font-normal text-ink outline-none transition placeholder:text-ink-faint focus:border-mint focus:ring-2 focus:ring-mint-soft"
                />
              </label>
            </div>

            {profileError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-coral-soft px-3.5 py-3 text-sm font-medium text-coral-ink"
              >
                {profileError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelProfileEditing}
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X aria-hidden="true" size={16} /> Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSavingProfile ||
                  !profileForm.fullName.trim() ||
                  !profileForm.role.trim()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? (
                  <LoaderCircle
                    aria-hidden="true"
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save aria-hidden="true" size={16} />
                )}
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        )}

        {!isEditingProfile && profileMessage && (
          <p
            aria-live="polite"
            className="mt-4 flex items-center gap-2 rounded-lg bg-mint-soft px-3.5 py-3 text-sm font-medium text-mint-ink"
          >
            <UserRound aria-hidden="true" size={16} /> {profileMessage}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <SunMoon aria-hidden="true" size={18} className="text-honey-ink" />
          <h2 className="font-bold text-ink">Appearance</h2>
        </div>
        <div className="mt-2 divide-y divide-line-soft">
          <ToggleRow
            label="Dark mode"
            description="Use a lower-glare appearance throughout Smart Pillbox."
            enabled={darkMode}
            onChange={handleDarkModeChange}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" size={18} className="text-coral" />
          <h2 className="font-bold text-ink">
            {mode === "my-care" ? "Helpful reminders" : "Notifications"}
          </h2>
        </div>
        <div className="mt-2 divide-y divide-line-soft">
          <ToggleRow
            label="Missed dose alerts"
            description={
              mode === "my-care"
                ? "A gentle reminder if a dose is still waiting."
                : "Tell me right away when a dose stays unopened past its window."
            }
            enabled={missedDoseAlerts}
            onChange={setMissedDoseAlerts}
          />
          {mode === "circle-care" && (
            <ToggleRow
              label="Late dose updates"
              description="A gentle heads-up when a dose is taken later than planned."
              enabled={lateDoseAlerts}
              onChange={setLateDoseAlerts}
            />
          )}
          <ToggleRow
            label="Device goes offline"
            description="Let me know if a pillbox stops syncing for more than an hour."
            enabled={deviceOfflineAlerts}
            onChange={setDeviceOfflineAlerts}
          />
          {mode === "circle-care" && (
            <ToggleRow
              label="Weekly care summary"
              description="A Sunday evening recap of the week's adherence, ready to share with family."
              enabled={weeklySummary}
              onChange={setWeeklySummary}
            />
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Moon aria-hidden="true" size={18} className="text-honey-ink" />
          <h2 className="font-bold text-ink">Quiet hours</h2>
        </div>
        <div className="mt-2 divide-y divide-line-soft">
          <ToggleRow
            label="Pause non-urgent alerts overnight"
            description="Between 22:00 and 07:00 only missed high-risk doses will notify you."
            enabled={quietHours}
            onChange={setQuietHours}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Smartphone aria-hidden="true" size={18} className="text-mint-ink" />
          <h2 className="font-bold text-ink">
            {mode === "my-care" ? "Share with family" : "Family mobile view"}
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {mode === "my-care"
            ? "A trusted family member can follow along from the mobile view when you choose."
            : "Family members can follow along from the mobile view — the same care feed, simplified for phones."}
        </p>
        <a
          href="/mobile"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-hover"
        >
          {mode === "my-care" ? "Open share view" : "Open mobile view"}
        </a>
      </section>
    </div>
  );
}
