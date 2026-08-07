"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  HardDrive,
  History,
  House,
  LoaderCircle,
  MemoryStick,
  Pill,
  Radio,
  RefreshCw,
  Router,
  ShieldCheck,
  Signal,
  Square,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from "lucide-react";

import { HARDWARE_DEMO_SLOT_ID } from "../../src/lib/hardwareDemoConfig";
import {
  LIVE_HARDWARE_CONNECT_CODE,
  LIVE_HARDWARE_DEVICE_ID,
} from "../../src/lib/liveHardwareAccount";
import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
  HardwarePlanSlot,
} from "../../src/types/hardware";
import type {
  HardwareTelemetry,
  HardwareTelemetryApiResponse,
} from "../../src/types/hardwareTelemetry";
import type { OpeningEvent } from "../../src/types/pillbox";

type LoadState = "loading" | "ready" | "error";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not reported";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(milliseconds: number | undefined): string {
  if (milliseconds === undefined) return "Waiting for telemetry";
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "Waiting for telemetry";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function signalLabel(rssi: number | undefined): string {
  if (rssi === undefined) return "Unknown";
  if (rssi >= -55) return "Excellent";
  if (rssi >= -67) return "Good";
  if (rssi >= -75) return "Fair";
  return "Weak";
}

function eventIsSimulation(event: OpeningEvent): boolean {
  return event.firmwareVersion?.startsWith("web-hardware-simulator") ?? false;
}

function eventIsStudioTest(event: OpeningEvent): boolean {
  return event.firmwareVersion?.startsWith("studio-link-test") ?? false;
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warning";
}) {
  const tones = {
    neutral: "bg-cream-deep text-ink-soft",
    good: "bg-mint-soft text-mint-ink",
    warning: "bg-honey-soft text-honey-ink",
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon aria-hidden="true" size={19} />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-bold text-ink">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-soft">{detail}</p>
    </article>
  );
}

export default function StudioConsole() {
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(null);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [events, setEvents] = useState<OpeningEvent[]>([]);
  const [plan, setPlan] = useState<HardwarePlanSlot[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [commandPending, setCommandPending] = useState(false);
  const [notice, setNotice] = useState("");

  const loadStudio = useCallback(async (quiet = false) => {
    if (!quiet) setLoadState("loading");

    try {
      const deviceId = encodeURIComponent(LIVE_HARDWARE_DEVICE_ID);
      const [stateResponse, telemetryResponse, eventsResponse, planResponse] =
        await Promise.all([
          fetch(`/api/hardware/state?deviceId=${deviceId}`, { cache: "no-store" }),
          fetch(`/api/hardware/telemetry?deviceId=${deviceId}`, {
            cache: "no-store",
          }),
          fetch(`/api/hardware/events?deviceId=${deviceId}&limit=40`, {
            cache: "no-store",
          }),
          fetch(`/api/hardware/plan?deviceId=${deviceId}`, { cache: "no-store" }),
        ]);

      if (
        !stateResponse.ok ||
        !telemetryResponse.ok ||
        !eventsResponse.ok ||
        !planResponse.ok
      ) {
        throw new Error("Studio could not reach the hardware service.");
      }

      const [nextState, telemetryData, eventsData, planData] = await Promise.all([
        stateResponse.json() as Promise<HardwareDeviceState>,
        telemetryResponse.json() as Promise<HardwareTelemetryApiResponse>,
        eventsResponse.json() as Promise<HardwareEventsApiResponse>,
        planResponse.json() as Promise<HardwarePlanApiResponse>,
      ]);

      setDeviceState(nextState);
      setTelemetry(telemetryData.telemetry);
      setEvents(eventsData.events);
      setPlan(planData.slots);
      setLastRefreshAt(new Date().toISOString());
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setNotice(error instanceof Error ? error.message : "Studio refresh failed.");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStudio();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadStudio]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = window.setInterval(() => {
      void loadStudio(true);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [autoRefresh, loadStudio]);

  const isConnected = deviceState?.connectionStatus === "connected";
  const simulatedEventCount = useMemo(
    () => events.filter(eventIsSimulation).length,
    [events]
  );
  const studioTestEventCount = useMemo(
    () => events.filter(eventIsStudioTest).length,
    [events]
  );
  const realEventCount = events.length - simulatedEventCount - studioTestEventCount;
  const activePlan = plan.find((slot) => slot.slotId === HARDWARE_DEMO_SLOT_ID);

  async function setReminder(status: "idle" | "reminding") {
    setCommandPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/hardware/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: LIVE_HARDWARE_DEVICE_ID,
          status,
          activeSlot: status === "reminding" ? HARDWARE_DEMO_SLOT_ID : null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Command was not accepted.");
      }
      setNotice(
        status === "reminding"
          ? "Reminder command accepted. The device will pick it up on its next poll."
          : "Stop command accepted."
      );
      await loadStudio(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setCommandPending(false);
    }
  }

  async function recordStudioOpening(slotId: number) {
    setCommandPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/hardware/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: LIVE_HARDWARE_DEVICE_ID,
          slotId,
          eventType: "lid_open",
          firmwareVersion: "studio-link-test-1.0.0",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "The test opening was not recorded.");
      }
      setNotice(
        `Studio recorded a Slot ${slotId} test opening. The iPhone app will receive it on its next refresh.`
      );
      await loadStudio(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Test opening failed.");
    } finally {
      setCommandPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action text-on-action">
              <Wrench aria-hidden="true" size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">Smart Pillbox Studio</p>
                <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-ink">
                  Device ops
                </span>
              </div>
              <p className="truncate text-xs text-ink-soft">
                Connect {LIVE_HARDWARE_CONNECT_CODE} · {LIVE_HARDWARE_DEVICE_ID}
              </p>
            </div>
          </div>

          <nav aria-label="Studio navigation" className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-cream-deep hover:text-ink sm:flex"
            >
              <House aria-hidden="true" size={16} /> Dashboard
            </Link>
            <Link
              href="/hardware-simulator"
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cream-deep"
            >
              Simulator <ExternalLink aria-hidden="true" size={14} />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                  isConnected
                    ? "bg-mint-soft text-mint-ink"
                    : "bg-honey-soft text-honey-ink"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "animate-pulse bg-mint" : "bg-honey"
                  }`}
                />
                {isConnected ? "Physical device online" : "Physical device offline"}
              </span>
              {telemetry ? (
                <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft">
                  Telemetry active
                </span>
              ) : (
                <span className="rounded-full border border-honey-line bg-honey-soft px-3 py-1.5 text-xs font-semibold text-honey-ink">
                  Waiting for firmware telemetry
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
              Device operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft sm:text-base">
              Live health, commands, medication plan, and event provenance for the
              physical pillbox. Opening this page never marks the device online.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((current) => !current)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                autoRefresh
                  ? "border-mint-line bg-mint-soft text-mint-ink"
                  : "border-line bg-surface text-ink-soft"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Radio aria-hidden="true" size={15} />
                {autoRefresh ? "Live refresh on" : "Live refresh off"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void loadStudio()}
              disabled={loadState === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-action px-3 py-2 text-sm font-semibold text-on-action transition hover:bg-action-hover disabled:opacity-60"
            >
              {loadState === "loading" ? (
                <LoaderCircle aria-hidden="true" size={15} className="animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" size={15} />
              )}
              Refresh
            </button>
          </div>
        </section>

        {notice ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-card">
            <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-honey-ink" />
            <p className="leading-5">{notice}</p>
          </div>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={isConnected ? Wifi : WifiOff}
            label="Connection"
            value={isConnected ? "Online" : deviceState?.connectionStatus === "never_connected" ? "Never connected" : "Offline"}
            detail={`Last heartbeat ${formatDateTime(deviceState?.lastSeenAt)}`}
            tone={isConnected ? "good" : "warning"}
          />
          <StatCard
            icon={Signal}
            label="Wi-Fi signal"
            value={telemetry ? `${telemetry.wifiRssi} dBm` : "Not reported"}
            detail={signalLabel(telemetry?.wifiRssi)}
            tone={telemetry && telemetry.wifiRssi >= -75 ? "good" : "warning"}
          />
          <StatCard
            icon={Gauge}
            label="Uptime"
            value={formatDuration(telemetry?.uptimeMs)}
            detail={telemetry ? "Since the last device boot" : "Requires updated firmware"}
          />
          <StatCard
            icon={History}
            label="Event channel"
            value={`${realEventCount} physical`}
            detail={`${studioTestEventCount} Studio tests · ${simulatedEventCount} simulator`}
            tone={realEventCount > 0 ? "good" : "neutral"}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Live hardware
                  </p>
                  <h2 className="mt-1 text-lg font-bold">System health</h2>
                </div>
                <span className="text-xs text-ink-soft">
                  Refreshed {formatDateTime(lastRefreshAt)}
                </span>
              </header>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: HardDrive,
                    label: "Firmware",
                    value: telemetry?.firmwareVersion ?? events.find((event) => !eventIsSimulation(event))?.firmwareVersion ?? "Not reported",
                    detail: "Physical device build",
                  },
                  {
                    icon: Router,
                    label: "Local address",
                    value: telemetry?.ipAddress ?? "Not reported",
                    detail: "Private Wi-Fi address",
                  },
                  {
                    icon: MemoryStick,
                    label: "Free heap",
                    value: formatBytes(telemetry?.freeHeapBytes),
                    detail: "Available device memory",
                  },
                  {
                    icon: Activity,
                    label: "Upload queue",
                    value: telemetry ? `${telemetry.uploadQueueDepth} pending` : "Not reported",
                    detail: telemetry?.uploadQueueDepth ? "Waiting to retry" : "No queued events reported",
                  },
                  {
                    icon: BellRing,
                    label: "Reminder output",
                    value: deviceState?.status === "reminding" ? `Slot ${deviceState.activeSlot}` : "Idle",
                    detail: deviceState?.trigger ? `${deviceState.trigger} trigger` : "No active trigger",
                  },
                  {
                    icon: ShieldCheck,
                    label: "Telemetry age",
                    value: telemetry ? formatDateTime(telemetry.receivedAt) : "Not received",
                    detail: "Server receipt time",
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`p-5 sm:p-6 ${
                        index < 3 ? "border-b border-line-soft" : ""
                      } ${index % 3 !== 2 ? "lg:border-r lg:border-line-soft" : ""} ${
                        index % 2 === 0 ? "sm:border-r sm:border-line-soft lg:border-r" : ""
                      }`}
                    >
                      <Icon aria-hidden="true" size={18} className="text-ink-faint" />
                      <p className="mt-4 text-xs font-semibold text-ink-soft">{item.label}</p>
                      <p className="mt-1 truncate font-bold text-ink">{item.value}</p>
                      <p className="mt-1 truncate text-xs text-ink-faint">{item.detail}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <header className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Provenance-aware
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Recent device events</h2>
                </div>
                <span className="rounded-full bg-cream-deep px-3 py-1 text-xs font-semibold text-ink-soft">
                  {events.length} events
                </span>
              </header>

              {events.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Box aria-hidden="true" size={28} className="mx-auto text-ink-faint" />
                  <p className="mt-4 font-semibold">No device events yet</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Physical lid openings will appear here after the device uploads them.
                  </p>
                </div>
              ) : (
                <div className="max-h-[430px] divide-y divide-line-soft overflow-y-auto feed-scroll">
                  {events.map((event) => {
                    const simulated = eventIsSimulation(event);
                    const studioTest = eventIsStudioTest(event);
                    const wrongSlot = event.eventType === "wrong_slot_open";
                    return (
                      <article
                        key={event.id}
                        className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            wrongSlot
                              ? "bg-coral-soft text-coral-ink"
                              : simulated
                                ? "bg-sky-soft text-sky-ink"
                                : studioTest
                                  ? "bg-honey-soft text-honey-ink"
                                : "bg-mint-soft text-mint-ink"
                          }`}
                        >
                          {simulated ? <Zap aria-hidden="true" size={17} /> : <Pill aria-hidden="true" size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold">
                              Slot {event.compartment} {wrongSlot ? "opened unexpectedly" : "opened"}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                simulated
                                  ? "bg-sky-soft text-sky-ink"
                                  : studioTest
                                    ? "bg-honey-soft text-honey-ink"
                                    : "bg-mint-soft text-mint-ink"
                              }`}
                            >
                              {simulated ? "Simulator" : studioTest ? "Studio test" : "Physical"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-ink-soft">
                            {event.medication} · {event.firmwareVersion ?? "firmware unknown"}
                          </p>
                        </div>
                        <time className="text-right text-xs font-semibold text-ink-soft">
                          {event.eventTime.slice(0, 10)}
                          <span className="mt-1 block text-ink">{event.eventTime.slice(-5)}</span>
                        </time>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Remote command
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Reminder control</h2>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  deviceState?.status === "reminding"
                    ? "bg-coral-soft text-coral-ink"
                    : "bg-cream-deep text-ink-soft"
                }`}>
                  <BellRing aria-hidden="true" size={19} />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-line-soft bg-cream p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Target</p>
                    <p className="mt-1 font-bold">Slot {HARDWARE_DEMO_SLOT_ID}</p>
                  </div>
                  <ChevronRight aria-hidden="true" size={17} className="text-ink-faint" />
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-semibold text-ink-soft">Medication</p>
                    <p className="mt-1 truncate font-bold">{activePlan?.medication || "Not configured"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void setReminder("reminding")}
                  disabled={commandPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-action px-3 py-3 text-sm font-semibold text-on-action transition hover:bg-action-hover disabled:opacity-50"
                >
                  <BellRing aria-hidden="true" size={16} /> Ring now
                </button>
                <button
                  type="button"
                  onClick={() => void setReminder("idle")}
                  disabled={commandPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-sm font-semibold text-ink transition hover:bg-cream-deep disabled:opacity-50"
                >
                  <Square aria-hidden="true" size={15} /> Stop
                </button>
              </div>
              <div className="mt-5 border-t border-line-soft pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  App link test
                </p>
                <p className="mt-2 text-xs leading-5 text-ink-soft">
                  Record a clearly labelled Studio test opening, then confirm it appears in the connected iPhone app.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[1, 2].map((slotId) => (
                    <button
                      key={slotId}
                      type="button"
                      onClick={() => void recordStudioOpening(slotId)}
                      disabled={commandPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-honey-line bg-honey-soft px-3 py-3 text-sm font-semibold text-honey-ink transition hover:brightness-95 disabled:opacity-50"
                    >
                      <Box aria-hidden="true" size={15} /> Open Slot {slotId}
                    </button>
                  ))}
                </div>
              </div>
              {!isConnected ? (
                <p className="mt-3 text-xs leading-5 text-honey-ink">
                  The device is offline. Commands remain on the server until it reconnects and polls.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-3">
                <Clock3 aria-hidden="true" size={18} className="text-honey-ink" />
                <h2 className="font-bold">Medication plan</h2>
              </div>
              <div className="mt-4 space-y-2">
                {plan.length === 0 ? (
                  <p className="rounded-xl bg-cream p-4 text-sm text-ink-soft">No plan configured.</p>
                ) : (
                  plan.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="flex items-center justify-between gap-4 rounded-xl border border-line-soft px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">Slot {slot.slotId} · {slot.medication || "Empty"}</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          {slot.highRisk ? "High-risk medication" : "Standard monitoring"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-cream-deep px-2.5 py-1.5 text-xs font-bold">
                        {slot.scheduledTime || "--:--"}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink"
              >
                Edit in medication plan <ChevronRight aria-hidden="true" size={15} />
              </Link>
            </section>

            <section className="rounded-2xl border border-mint-line bg-mint-soft p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-mint-ink" />
                <div>
                  <h2 className="font-bold text-ink">Studio integrity</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Page refreshes are read-only. Only firmware heartbeats can mark the physical device online, and simulator events are visibly labelled.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
