"use client";

import { useState } from "react";
import { Bell, Moon, Smartphone, UserRound } from "lucide-react";

type ToggleRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

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
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-card transition-all ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel() {
  const [missedDoseAlerts, setMissedDoseAlerts] = useState(true);
  const [lateDoseAlerts, setLateDoseAlerts] = useState(true);
  const [deviceOfflineAlerts, setDeviceOfflineAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-coral-ink">
          Your preferences
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          Settings
        </h1>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-soft text-sm font-bold text-mint-ink">
            SC
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-ink">Sarah Chen</h2>
            <p className="truncate text-sm text-ink-soft">
              Family caregiver · Looking after 3 people
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1.5 text-xs font-semibold text-ink-soft">
            <UserRound aria-hidden="true" size={14} /> Caregiver
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" size={18} className="text-coral" />
          <h2 className="font-bold text-ink">Notifications</h2>
        </div>
        <div className="mt-2 divide-y divide-line-soft">
          <ToggleRow
            label="Missed dose alerts"
            description="Tell me right away when a dose stays unopened past its window."
            enabled={missedDoseAlerts}
            onChange={setMissedDoseAlerts}
          />
          <ToggleRow
            label="Late dose updates"
            description="A gentle heads-up when a dose is taken later than planned."
            enabled={lateDoseAlerts}
            onChange={setLateDoseAlerts}
          />
          <ToggleRow
            label="Device goes offline"
            description="Let me know if a pillbox stops syncing for more than an hour."
            enabled={deviceOfflineAlerts}
            onChange={setDeviceOfflineAlerts}
          />
          <ToggleRow
            label="Weekly care summary"
            description="A Sunday evening recap of the week's adherence, ready to share with family."
            enabled={weeklySummary}
            onChange={setWeeklySummary}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6">
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

      <section className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2">
          <Smartphone aria-hidden="true" size={18} className="text-mint-ink" />
          <h2 className="font-bold text-ink">Family mobile view</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Family members can follow along from the mobile view — the same care
          feed, simplified for phones.
        </p>
        <a
          href="/mobile"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Open mobile view
        </a>
      </section>
    </div>
  );
}
