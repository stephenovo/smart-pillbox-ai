"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  Play,
  Radio,
  RotateCcw,
  Square,
  Trash2,
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
  onAnalysisDateChange: (value: string) => void;
  onAnalysisTimeChange: (value: string) => void;
  onLoadCareShiftSnapshot: () => void;
  onSimulateOpening: (item: MedicationSchedule) => void;
  onClearSimulationEvents: () => void;
};

function getConnectionLabel(state: HardwareDeviceState | null): string {
  if (!state) return "Checking";
  if (state.connectionStatus === "connected") return "Connected";
  if (state.connectionStatus === "offline") return "Offline";
  return "Never connected";
}

function getEventTitle(event: OpeningEvent): string {
  return event.eventType === "wrong_slot_open"
    ? `Wrong Slot ${event.compartment} opened`
    : `Slot ${event.compartment} opened`;
}

export function DeviceFeedPanel({
  analysisDate,
  analysisTime,
  events,
  schedule,
  onAnalysisDateChange,
  onAnalysisTimeChange,
  onLoadCareShiftSnapshot,
  onSimulateOpening,
  onClearSimulationEvents,
}: DeviceFeedPanelProps) {
  const [selectedSlot, setSelectedSlot] = useState(schedule[0]?.compartment ?? 1);
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(null);
  const [controlPending, setControlPending] = useState(false);
  const [controlError, setControlError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function syncDeviceState() {
      try {
        const response = await fetch(
          `/api/hardware/state?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;

        const nextState = (await response.json()) as HardwareDeviceState;
        if (isActive) setDeviceState(nextState);
      } catch {
        // The software simulation remains available when the device API is offline.
      }
    }

    syncDeviceState();
    const intervalId = window.setInterval(syncDeviceState, 2000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

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
        throw new Error("Reminder command was rejected.");
      }

      setDeviceState((await response.json()) as HardwareDeviceState);
    } catch (error) {
      setControlError(
        error instanceof Error ? error.message : "Reminder command failed."
      );
    } finally {
      setControlPending(false);
    }
  }

  const hardwareEvents = events.filter((event) => event.source === "hardware");
  const simulationEvents = events.filter((event) => event.source === "simulation");
  const latestHardwareEvent = hardwareEvents[0];
  const isConnected = deviceState?.connectionStatus === "connected";

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Live connection</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950 sm:text-3xl">
            Pillbox activity
          </h1>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            isConnected
              ? "bg-[#effaf7] text-teal-700"
              : "bg-stone-100 text-neutral-600"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-teal-500" : "bg-neutral-400"
            }`}
          />
          {getConnectionLabel(deviceState)}
        </div>
      </div>

      <section className="grid overflow-hidden rounded-lg border border-stone-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-stone-100">
        <div className="flex items-center gap-4 border-b border-stone-100 p-5 sm:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#effaf7] text-teal-700">
            <Wifi aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-neutral-500">Device ID</p>
            <p className="mt-1 truncate font-bold text-neutral-950">
              {deviceState?.deviceId ?? DEMO_DEVICE_ID}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 border-b border-stone-100 p-5 sm:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1f0] text-[#e34747]">
            <Activity aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Hardware openings</p>
            <p className="mt-1 font-bold text-neutral-950">
              {hardwareEvents.length} events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-neutral-600">
            <Radio aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-neutral-500">Latest hardware event</p>
            <p className="mt-1 truncate font-bold text-neutral-950">
              {latestHardwareEvent?.eventTime ?? "No event received"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-400">Audit trail</p>
              <h2 className="mt-1 text-lg font-bold text-neutral-950">Event history</h2>
            </div>
            <span className="text-xs font-semibold text-neutral-400">Newest first</span>
          </header>

          {events.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              No pillbox records have been received for this review window.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
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
                          ? "bg-[#fff1f0] text-[#d93f3f]"
                          : "bg-[#effaf7] text-teal-700"
                      }`}
                    >
                      {event.compartment}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-neutral-950">
                        {getEventTitle(event)}
                      </h3>
                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {event.medication} · {event.deviceId}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          event.source === "hardware"
                            ? "bg-teal-50 text-teal-700"
                            : "bg-stone-100 text-neutral-600"
                        }`}
                      >
                        {event.source}
                      </span>
                    </div>
                    <time className="text-right text-xs font-semibold text-neutral-500">
                      {event.eventTime.slice(0, 10)}
                      <span className="mt-1 block text-neutral-950">
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
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Radio aria-hidden="true" size={18} className="text-[#e34747]" />
              <h2 className="font-bold text-neutral-950">Hardware reminder</h2>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-semibold text-neutral-500">Active Slot</span>
              <select
                value={selectedSlot}
                onChange={(event) => setSelectedSlot(Number(event.target.value))}
                className="mt-2 w-full rounded-md border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-neutral-500"
              >
                {Array.from({ length: 8 }, (_, index) => index + 1).map((slotId) => {
                  const item = schedule.find((entry) => entry.compartment === slotId);
                  return (
                    <option key={slotId} value={slotId}>
                      Slot {slotId}{item?.medication ? ` - ${item.medication}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReminder("reminding")}
                disabled={controlPending}
                className="flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                <Play aria-hidden="true" size={15} /> Start
              </button>
              <button
                type="button"
                onClick={() => setReminder("idle")}
                disabled={controlPending}
                className="flex items-center justify-center gap-2 rounded-md border border-stone-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                <Square aria-hidden="true" size={14} /> Stop
              </button>
            </div>

            <dl className="mt-5 divide-y divide-stone-100 border-y border-stone-100 text-sm">
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-neutral-500">State</dt>
                <dd className="font-semibold text-neutral-950">
                  {deviceState?.status === "reminding"
                    ? `Reminding Slot ${deviceState.activeSlot}`
                    : "Idle"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-neutral-500">Trigger</dt>
                <dd className="font-semibold capitalize text-neutral-950">
                  {deviceState?.trigger ?? "None"}
                </dd>
              </div>
            </dl>

            {controlError && (
              <p className="mt-3 text-xs font-semibold text-[#d93f3f]">
                {controlError}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" size={18} className="text-[#e34747]" />
              <h2 className="font-bold text-neutral-950">Review window</h2>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Date</span>
                <input
                  type="date"
                  value={analysisDate}
                  onChange={(event) => onAnalysisDateChange(event.target.value)}
                  className="mt-2 w-full rounded-md border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-neutral-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Time</span>
                <input
                  type="time"
                  value={analysisTime}
                  onChange={(event) => onAnalysisTimeChange(event.target.value)}
                  className="mt-2 w-full rounded-md border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none focus:border-neutral-500"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={onLoadCareShiftSnapshot}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <RotateCcw aria-hidden="true" size={16} /> Load sample shift
            </button>
          </section>
        </aside>
      </div>

      <section className="border-t border-stone-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-400">
              Software fallback
            </p>
            <h2 className="mt-1 text-lg font-bold text-neutral-950">
              Opening simulation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClearSimulationEvents}
            disabled={simulationEvents.length === 0}
            className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-40"
          >
            <Trash2 aria-hidden="true" size={14} /> Clear simulated events
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {schedule.map((item) => (
            <button
              key={item.compartment}
              type="button"
              onClick={() => onSimulateOpening(item)}
              className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-neutral-400"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-neutral-400">
                  Slot {item.compartment}
                </span>
                <span className="mt-1 block truncate text-sm font-bold text-neutral-900">
                  {item.medication}
                </span>
              </span>
              <Play aria-hidden="true" size={16} className="shrink-0 text-teal-700" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
