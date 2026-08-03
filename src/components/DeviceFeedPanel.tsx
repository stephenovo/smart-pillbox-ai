"use client";

import { useState } from "react";
import {
  Activity,
  BellRing,
  CalendarDays,
  Check,
  Radio,
  Square,
  Wifi,
} from "lucide-react";
import { DEMO_DEVICE_ID } from "../lib/hardwareProtocol";
import type { HardwareDeviceState } from "../types/hardware";
import type { MedicationSchedule, OpeningEvent } from "../types/pillbox";

type DeviceFeedPanelProps = {
  analysisDate: string;
  analysisTime: string;
  events: OpeningEvent[];
  schedule: MedicationSchedule[];
  deviceState: HardwareDeviceState | null;
  onAnalysisDateChange: (value: string) => void;
};

function friendlyEventTitle(event: OpeningEvent): string {
  if (event.eventType === "wrong_slot_open") {
    return `Compartment ${event.compartment} opened during another reminder`;
  }
  return `Compartment ${event.compartment} opened`;
}

export function DeviceFeedPanel({
  analysisDate,
  events,
  schedule,
  deviceState,
  onAnalysisDateChange,
}: DeviceFeedPanelProps) {
  const [selectedSlot, setSelectedSlot] = useState(
    schedule[0]?.compartment ?? 1
  );
  const [controlPending, setControlPending] = useState(false);
  const [controlError, setControlError] = useState("");

  async function setReminder(status: "idle" | "reminding") {
    setControlPending(true);
    setControlError("");

    try {
      const response = await fetch("/api/hardware/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          status,
          activeSlot: status === "reminding" ? selectedSlot : null,
        }),
      });

      if (!response.ok) {
        throw new Error("The pillbox didn't respond. Please try again.");
      }
    } catch (error) {
      setControlError(
        error instanceof Error ? error.message : "The reminder request failed."
      );
    } finally {
      setControlPending(false);
    }
  }

  const isSynced = deviceState?.connectionStatus === "connected";
  const latestEvent = events[0];
  const todayEvents = events.filter((event) =>
    event.eventTime.startsWith(analysisDate)
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-mint-ink">
            Margaret&apos;s pillbox
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            Device activity
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every opening the pillbox has reported, as it happened.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            isSynced
              ? "bg-mint-soft text-mint-ink"
              : "bg-cream-deep text-ink-soft"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isSynced ? "bg-mint" : "bg-ink-faint"
            }`}
          />
          {isSynced ? "Syncing normally" : "Waiting for device"}
        </div>
      </div>

      <section className="grid overflow-hidden rounded-lg border border-line bg-surface shadow-card sm:grid-cols-3 sm:divide-x sm:divide-line-soft">
        <div className="flex items-center gap-4 border-b border-line-soft p-5 sm:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-soft text-mint-ink">
            <Wifi aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">Last sync</p>
            <p className="mt-1 truncate font-bold text-ink">
              {deviceState?.lastSeenAt
                ? `Today ${deviceState.lastSeenAt.slice(11, 16)}`
                : "Not yet today"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 border-b border-line-soft p-5 sm:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coral-soft text-coral-ink">
            <Activity aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Openings today</p>
            <p className="mt-1 font-bold text-ink">
              {todayEvents.length}{" "}
              {todayEvents.length === 1 ? "opening" : "openings"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-deep text-ink-soft">
            <Radio aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">Most recent</p>
            <p className="mt-1 truncate font-bold text-ink">
              {latestEvent
                ? `${friendlyEventTitle(latestEvent)} · ${latestEvent.eventTime.slice(-5)}`
                : "No openings yet"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <header className="flex items-center justify-between border-b border-line-soft px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {analysisDate}
              </p>
              <h2 className="mt-1 text-lg font-bold text-ink">
                What the pillbox reported
              </h2>
            </div>
            <span className="text-xs font-semibold text-ink-faint">
              Newest first
            </span>
          </header>

          {events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink">
                No openings recorded for this day
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                When Margaret opens her pillbox, it will show up here within a
                few seconds.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line-soft">
              {events.map((event) => {
                const isWrongSlot = event.eventType === "wrong_slot_open";
                return (
                  <article
                    key={event.id}
                    className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        isWrongSlot
                          ? "bg-coral-soft text-coral-ink"
                          : "bg-mint-soft text-mint-ink"
                      }`}
                    >
                      {event.compartment}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink">
                        {friendlyEventTitle(event)}
                      </h3>
                      <p className="mt-1 truncate text-xs text-ink-soft">
                        {event.medication}
                      </p>
                    </div>
                    <time className="text-right text-xs font-semibold text-ink-soft">
                      {event.eventTime.slice(0, 10)}
                      <span className="mt-1 block text-ink">
                        {event.eventTime.slice(-5)}
                      </span>
                    </time>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2">
              <BellRing aria-hidden="true" size={18} className="text-coral" />
              <h2 className="font-bold text-ink">Ring a reminder</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Make Margaret&apos;s pillbox light up and chime for a chosen
              compartment — handy while you&apos;re on the phone with her.
            </p>

            <label className="mt-5 block">
              <span className="text-xs font-semibold text-ink-soft">
                Compartment
              </span>
              <select
                value={selectedSlot}
                onChange={(event) => setSelectedSlot(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-line bg-cream px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-ink-soft"
              >
                {Array.from({ length: 8 }, (_, index) => index + 1).map(
                  (slotId) => {
                    const item = schedule.find(
                      (entry) => entry.compartment === slotId
                    );
                    return (
                      <option key={slotId} value={slotId}>
                        Compartment {slotId}
                        {item?.medication ? ` — ${item.medication}` : ""}
                      </option>
                    );
                  }
                )}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReminder("reminding")}
                disabled={controlPending}
                className="flex items-center justify-center gap-2 rounded-lg bg-action px-3 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-hover disabled:opacity-50"
              >
                <BellRing aria-hidden="true" size={15} /> Ring now
              </button>
              <button
                type="button"
                onClick={() => setReminder("idle")}
                disabled={controlPending}
                className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream disabled:opacity-50"
              >
                <Square aria-hidden="true" size={14} /> Stop
              </button>
            </div>

            {deviceState?.status === "reminding" && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-mint-ink">
                <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
                Ringing for compartment {deviceState.activeSlot} right now
              </p>
            )}

            {controlError && (
              <p className="mt-3 text-xs font-semibold text-coral-ink">
                {controlError}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" size={18} className="text-honey-ink" />
              <h2 className="font-bold text-ink">Look back at a day</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Review an earlier day&apos;s openings and dose statuses.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-ink-soft">Date</span>
              <input
                type="date"
                value={analysisDate}
                onChange={(event) => onAnalysisDateChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-cream px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-ink-soft"
              />
            </label>
          </section>

          <section className="rounded-lg border border-mint-line bg-mint-soft p-5 shadow-card">
            <div className="flex items-start gap-2.5">
              <Check aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-mint-ink" />
              <p className="text-sm leading-6 text-ink">
                Everything you see here came straight from Margaret&apos;s
                pillbox — the same feed her family sees on their phones.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
