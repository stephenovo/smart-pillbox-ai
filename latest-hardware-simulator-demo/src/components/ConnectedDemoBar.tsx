"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Cpu,
  LayoutDashboard,
  MonitorUp,
  PackageOpen,
  Power,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";

import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
  IntegrationMode,
} from "../types/hardware";
import type { OpeningEvent } from "../types/pillbox";

type DemoSurface = "dashboard" | "hardware" | "mobile";

type ConnectedDemoBarProps = {
  activeSurface: DemoSurface;
  compact?: boolean;
  mode: IntegrationMode;
  activeDeviceId: string | null;
  isChangingMode: boolean;
  onModeChange: (mode: IntegrationMode) => Promise<unknown>;
};

const modeOptions: {
  id: IntegrationMode;
  label: string;
  icon: typeof Power;
}[] = [
  { id: "standalone", label: "Standalone", icon: Power },
  { id: "simulator", label: "Simulator", icon: MonitorUp },
  { id: "hardware", label: "Hardware", icon: Cpu },
];

const demoLinks: {
  id: DemoSurface;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "dashboard",
    label: "Caregiver Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    id: "hardware",
    label: "Hardware Simulator",
    href: "/hardware-simulator-preview",
    icon: PackageOpen,
  },
  {
    id: "mobile",
    label: "Mobile Care View",
    href: "/mobile",
    icon: Smartphone,
  },
];

function getEventLabel(event: OpeningEvent | null): string {
  if (!event) {
    return "Waiting for event";
  }

  if (event.eventType === "wrong_slot_open") {
    return `Wrong Slot Opened: Slot ${event.compartment}`;
  }

  return `Slot ${event.compartment} opened`;
}

function getAlertLabel(event: OpeningEvent | null): string {
  if (!event) {
    return "No active alert";
  }

  if (event.eventType === "wrong_slot_open") {
    return "Caregiver alert active";
  }

  return "Medication confirmed";
}

export function ConnectedDemoBar({
  activeSurface,
  compact = false,
  mode,
  activeDeviceId,
  isChangingMode,
  onModeChange,
}: ConnectedDemoBarProps) {
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(
    null
  );
  const [latestEvent, setLatestEvent] = useState<OpeningEvent | null>(null);
  const [planCount, setPlanCount] = useState(0);

  useEffect(() => {
    if (!activeDeviceId) return;

    let isActive = true;

    async function loadConnectedDemoState() {
      try {
        const [stateResponse, eventsResponse, planResponse] = await Promise.all([
          fetch(`/api/hardware/state?deviceId=${activeDeviceId}`, {
            cache: "no-store",
          }),
          fetch(`/api/hardware/events?deviceId=${activeDeviceId}&limit=1`, {
            cache: "no-store",
          }),
          fetch(`/api/hardware/plan?deviceId=${activeDeviceId}`, {
            cache: "no-store",
          }),
        ]);

        if (!stateResponse.ok || !eventsResponse.ok || !planResponse.ok) {
          return;
        }

        const stateData = (await stateResponse.json()) as HardwareDeviceState;
        const eventData =
          (await eventsResponse.json()) as HardwareEventsApiResponse;
        const planData = (await planResponse.json()) as HardwarePlanApiResponse;

        if (!isActive) {
          return;
        }

        setDeviceState(stateData);
        setLatestEvent(eventData.events[0] ?? null);
        setPlanCount(
          planData.slots.filter((slot) => slot.medication.trim() !== "").length
        );
      } catch {
        if (isActive) {
          setDeviceState(null);
        }
      }
    }

    loadConnectedDemoState();
    const intervalId = window.setInterval(loadConnectedDemoState, 2500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeDeviceId]);

  const visibleDeviceState =
    deviceState?.deviceId === activeDeviceId ? deviceState : null;
  const visibleLatestEvent =
    latestEvent?.deviceId === activeDeviceId ? latestEvent : null;
  const isWrongSlot = visibleLatestEvent?.eventType === "wrong_slot_open";
  const connectionLabel =
    mode === "standalone"
      ? "standby"
      : visibleDeviceState?.connectionStatus ?? "checking";
  const activeSlotLabel = visibleDeviceState?.activeSlot
    ? `Slot ${visibleDeviceState.activeSlot}`
    : "None";

  const statusTone = useMemo(() => {
    if (isWrongSlot) {
      return "border-red-200 bg-red-50 text-red-800";
    }

    if (visibleLatestEvent) {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    return "border-sky-200 bg-sky-50 text-sky-800";
  }, [isWrongSlot, visibleLatestEvent]);

  return (
    <section
      className={`border-b border-stone-200 bg-white/95 backdrop-blur ${
        compact ? "px-4 py-3" : "px-4 py-4 sm:px-7 lg:px-10"
      }`}
    >
      <div
        className={`mx-auto grid w-full gap-3 ${
          compact
            ? "max-w-md"
            : "max-w-[1440px] xl:grid-cols-[minmax(330px,0.9fr)_minmax(0,1.6fr)] xl:items-start"
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-neutral-500">
              Connection source
            </span>
            <span className="text-xs font-semibold text-neutral-500">
              {activeDeviceId ? `Device ${activeDeviceId}` : "Interfaces ready"}
            </span>
          </div>

          <div
            className="mt-2 inline-grid grid-cols-3 rounded-lg border border-stone-200 bg-stone-100 p-1"
            aria-label="Integration mode"
          >
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === mode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void onModeChange(option.id)}
                  disabled={isChangingMode}
                  aria-pressed={isActive}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition sm:px-3 ${
                    isActive
                      ? "bg-white text-neutral-950 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-950"
                  } disabled:cursor-wait disabled:opacity-60`}
                >
                  <Icon aria-hidden="true" size={14} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <nav className="mt-3 flex flex-wrap gap-2">
            {demoLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSurface;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-stone-200 bg-white text-neutral-700 hover:border-teal-200 hover:bg-teal-50"
                  }`}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{compact ? item.label.split(" ")[0] : item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-1"
              : "sm:grid-cols-3"
          }`}
        >
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              {mode !== "standalone" && connectionLabel === "connected" ? (
                <Wifi aria-hidden="true" size={15} className="text-teal-600" />
              ) : (
                <WifiOff aria-hidden="true" size={15} className="text-red-500" />
              )}
              System link
            </div>
            <p className="mt-1 text-sm font-bold text-neutral-950">
              {mode === "standalone"
                ? "Disconnected by default"
                : `${connectionLabel} · ${visibleDeviceState ? planCount : 0} active meds`}
            </p>
          </div>

          <div className={`rounded-lg border p-3 ${statusTone}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Activity aria-hidden="true" size={15} />
              Latest source event
            </div>
            <p className="mt-1 truncate text-sm font-bold">
              {getEventLabel(visibleLatestEvent)}
            </p>
          </div>

          <div className={`rounded-lg border p-3 ${statusTone}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <BellRing aria-hidden="true" size={15} />
              Caregiver signal
            </div>
            <p className="mt-1 truncate text-sm font-bold">
              {getAlertLabel(visibleLatestEvent)} · expected {activeSlotLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
