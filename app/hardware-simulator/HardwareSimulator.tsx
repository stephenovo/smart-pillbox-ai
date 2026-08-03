"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Box,
  CircleAlert,
  Clock3,
  History,
  LoaderCircle,
  Pill,
  Power,
  Radio,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { DEMO_DEVICE_ID } from "../../src/lib/hardwareProtocol";
import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
  HardwarePlanSlot,
} from "../../src/types/hardware";
import type { OpeningEvent } from "../../src/types/pillbox";

type HardwareEventPostResponse = {
  accepted?: boolean;
  recorded?: boolean;
  duplicate?: boolean;
  event?: OpeningEvent | null;
  error?: string;
};

const slotIds = Array.from({ length: 8 }, (_, index) => index + 1);
const firmwareVersion = "web-simulator-1.0.0";

function formatTime(value: string | null | undefined): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(-5);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function slotLabel(slot: HardwarePlanSlot | undefined): string {
  return slot?.medication.trim() || "Empty";
}

function eventLabel(event: OpeningEvent): string {
  return event.eventType === "wrong_slot_open"
    ? `Wrong lid: compartment ${event.compartment}`
    : `Compartment ${event.compartment} opened`;
}

export default function HardwareSimulator() {
  const [plan, setPlan] = useState<HardwarePlanSlot[]>([]);
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(
    null
  );
  const [events, setEvents] = useState<OpeningEvent[]>([]);
  const [openLids, setOpenLids] = useState<Set<number>>(() => new Set());
  const [powered, setPowered] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const refreshHardware = useCallback(async (sendHeartbeat: boolean) => {
    try {
      const heartbeat = sendHeartbeat ? "&heartbeat=1" : "";
      const [planResponse, stateResponse, eventsResponse] = await Promise.all([
        fetch(
          `/api/hardware/plan?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/hardware/state?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}${heartbeat}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/hardware/events?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}&limit=20`,
          { cache: "no-store" }
        ),
      ]);

      if (!planResponse.ok || !stateResponse.ok || !eventsResponse.ok) {
        throw new Error("The simulator could not reach the hardware API.");
      }

      const [planData, stateData, eventsData] = (await Promise.all([
        planResponse.json(),
        stateResponse.json(),
        eventsResponse.json(),
      ])) as [
        HardwarePlanApiResponse,
        HardwareDeviceState,
        HardwareEventsApiResponse,
      ];

      setPlan(planData.slots);
      setDeviceState(stateData);
      setEvents(eventsData.events);
      setError("");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "The hardware API is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRequestId = window.setTimeout(
      () => void refreshHardware(powered),
      0
    );
    const intervalId = window.setInterval(
      () => void refreshHardware(powered),
      3500
    );
    return () => {
      window.clearTimeout(initialRequestId);
      window.clearInterval(intervalId);
    };
  }, [powered, refreshHardware]);

  const planBySlot = useMemo(
    () => new Map(plan.map((slot) => [slot.slotId, slot])),
    [plan]
  );

  const isReminding = powered && deviceState?.status === "reminding";
  const activeSlot = isReminding ? deviceState.activeSlot : null;
  const connectionLabel = !powered
    ? "Powered off"
    : deviceState?.connectionStatus === "connected"
      ? "Online"
      : "Connecting";

  async function toggleLid(slotId: number) {
    if (!powered || pendingSlot !== null) return;

    if (openLids.has(slotId)) {
      setOpenLids((current) => {
        const next = new Set(current);
        next.delete(slotId);
        return next;
      });
      return;
    }

    setOpenLids((current) => new Set(current).add(slotId));
    setPendingSlot(slotId);
    setError("");

    try {
      const response = await fetch("/api/hardware/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          slotId,
          eventType: "lid_open",
          deviceTimestamp: new Date().toISOString(),
          firmwareVersion,
        }),
      });
      const data = (await response.json()) as HardwareEventPostResponse;

      if (!response.ok || !data.accepted) {
        throw new Error(data.error || "The opening event was rejected.");
      }

      await refreshHardware(true);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "The lid opening could not be sent."
      );
    } finally {
      setPendingSlot(null);
    }
  }

  async function clearEventLog() {
    setClearing(true);
    setError("");
    try {
      const response = await fetch(
        `/api/hardware/events?deviceId=${encodeURIComponent(DEMO_DEVICE_ID)}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("The event log could not be cleared.");
      setEvents([]);
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "The event log could not be cleared."
      );
    } finally {
      setClearing(false);
    }
  }

  function togglePower() {
    setPowered((current) => !current);
    setOpenLids(new Set());
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#eef1ee] text-[#1d2420]">
      <header className="border-b border-[#d9dfda] bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#18352b] text-white">
              <Box aria-hidden="true" size={21} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">
                Pillbox hardware simulator
              </h1>
              <p className="truncate text-xs font-medium text-[#66726b]">
                {DEMO_DEVICE_ID} · {firmwareVersion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-2 text-xs font-bold sm:flex ${
                powered ? "text-[#176a4c]" : "text-[#7a6663]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  powered ? "bg-[#1b9d70]" : "bg-[#9a8a87]"
                }`}
              />
              {connectionLabel}
            </span>
            <button
              type="button"
              onClick={() => void refreshHardware(powered)}
              aria-label="Refresh hardware state"
              title="Refresh hardware state"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d9dfda] bg-white text-[#4e5a53] transition hover:bg-[#f3f5f3]"
            >
              <RotateCcw aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={togglePower}
              aria-pressed={powered}
              className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                powered
                  ? "bg-[#18352b] text-white hover:bg-[#24483b]"
                  : "border border-[#cfc6c3] bg-white text-[#6f5c58] hover:bg-[#f6f2f1]"
              }`}
            >
              <Power aria-hidden="true" size={17} />
              {powered ? "Power off" : "Power on"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-[#efc9c4] bg-[#fff3f1] px-4 py-3 text-sm font-semibold text-[#9b3e32]"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
            <span>{error}</span>
          </div>
        )}

        <section className="mb-5 grid overflow-hidden rounded-lg border border-[#d9dfda] bg-white sm:grid-cols-3 sm:divide-x sm:divide-[#e3e7e3]">
          <div className="flex min-h-20 items-center gap-3 border-b border-[#e3e7e3] px-4 py-3 sm:border-b-0">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                powered
                  ? "bg-[#e4f5ed] text-[#176a4c]"
                  : "bg-[#f1eeee] text-[#7a6663]"
              }`}
            >
              {powered ? (
                <Wifi aria-hidden="true" size={18} />
              ) : (
                <WifiOff aria-hidden="true" size={18} />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold text-[#748078]">Device</p>
              <p className="mt-0.5 text-sm font-bold">{connectionLabel}</p>
            </div>
          </div>
          <div className="flex min-h-20 items-center gap-3 border-b border-[#e3e7e3] px-4 py-3 sm:border-b-0">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isReminding
                  ? "bg-[#fff0cf] text-[#8c5d00]"
                  : "bg-[#edf0ed] text-[#657169]"
              }`}
            >
              <BellRing aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#748078]">Buzzer</p>
              <p className="mt-0.5 text-sm font-bold">
                {isReminding ? `Slot ${activeSlot} active` : "Standby"}
              </p>
            </div>
          </div>
          <div className="flex min-h-20 items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f0f7] text-[#315f80]">
              <Radio aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#748078]">Last packet</p>
              <p className="mt-0.5 text-sm font-bold">
                {formatTime(deviceState?.lastSeenAt)}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.65fr)]">
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[#66726b]">
                  Physical unit
                </p>
                <h2 className="mt-1 text-xl font-bold">8-compartment pillbox</h2>
              </div>
              <span className="text-xs font-semibold text-[#66726b]">
                {openLids.size} {openLids.size === 1 ? "lid" : "lids"} open
              </span>
            </div>

            <div
              className={`rounded-lg border border-[#aeb8b1] bg-[#cbd2cc] p-3 shadow-[0_18px_35px_-26px_rgba(24,53,43,0.65)] sm:p-5 ${
                powered ? "" : "opacity-60 grayscale"
              }`}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {slotIds.map((slotId) => {
                  const slot = planBySlot.get(slotId);
                  const isOpen = openLids.has(slotId);
                  const isActive = activeSlot === slotId;
                  const isPending = pendingSlot === slotId;

                  return (
                    <button
                      key={slotId}
                      type="button"
                      onClick={() => void toggleLid(slotId)}
                      disabled={!powered || pendingSlot !== null}
                      aria-pressed={isOpen}
                      aria-label={`${isOpen ? "Close" : "Open"} compartment ${slotId}`}
                      className={`group relative aspect-square min-w-0 overflow-hidden rounded-lg border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176a4c] disabled:cursor-not-allowed ${
                        isActive
                          ? "border-[#d99a21] bg-[#ffedbd] shadow-[0_0_0_3px_rgba(217,154,33,0.22)]"
                          : "border-[#aeb8b1] bg-[#b7c0b9]"
                      }`}
                    >
                      <span className="absolute inset-2 flex flex-col items-center justify-center rounded-lg border border-[#3f4943] bg-[#56625a] px-2 text-center text-white shadow-inner">
                        {isPending ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="animate-spin"
                            size={20}
                          />
                        ) : (
                          <>
                            <Pill aria-hidden="true" size={20} />
                            <span className="mt-1 text-[10px] font-bold uppercase">
                              Lid open
                            </span>
                          </>
                        )}
                      </span>

                      <span
                        className={`absolute inset-2 flex origin-top flex-col justify-between rounded-lg border bg-[#f9faf9] p-3 shadow-md transition duration-200 ${
                          isOpen
                            ? "-translate-y-[43%] scale-y-[0.52] border-[#8e9a92] shadow-lg"
                            : "translate-y-0 scale-y-100 border-[#d5dbd6] group-hover:-translate-y-0.5"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-2xl font-black text-[#253029]">
                            {slotId}
                          </span>
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              isActive
                                ? "animate-pulse bg-[#e7a62e]"
                                : "bg-[#b7c0b9]"
                            }`}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#36423a]">
                            {slotLabel(slot)}
                          </span>
                          <span className="mt-1 block text-[10px] font-semibold text-[#758078]">
                            {slot?.scheduledTime || "No schedule"}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#aeb8b1] bg-[#e7ebe7] px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4f5b53]">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      powered ? "bg-[#1b9d70]" : "bg-[#91847f]"
                    }`}
                  />
                  ESP32-S3
                </div>
                <div className="font-mono text-xs font-bold text-[#536057]">
                  {isReminding ? `OPEN SLOT ${activeSlot}` : "READY"}
                </div>
              </div>
            </div>
          </section>

          <aside className="overflow-hidden rounded-lg border border-[#d9dfda] bg-white">
            <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[#e3e7e3] px-4 py-3">
              <div className="flex items-center gap-2">
                <History aria-hidden="true" size={18} className="text-[#526058]" />
                <div>
                  <h2 className="text-sm font-bold">Event transmission</h2>
                  <p className="text-xs font-medium text-[#748078]">
                    {events.length} packets retained
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void clearEventLog()}
                disabled={clearing || events.length === 0}
                aria-label="Clear event log"
                title="Clear event log"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6b756e] transition hover:bg-[#f1f3f1] hover:text-[#9b3e32] disabled:opacity-35"
              >
                {clearing ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                ) : (
                  <Trash2 aria-hidden="true" size={16} />
                )}
              </button>
            </header>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-[#748078]">
                <LoaderCircle aria-hidden="true" className="animate-spin" size={22} />
              </div>
            ) : events.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <Radio aria-hidden="true" size={25} className="text-[#9ba59e]" />
                <p className="mt-3 text-sm font-bold">No packets sent</p>
              </div>
            ) : (
              <div className="feed-scroll max-h-[610px] divide-y divide-[#edf0ed] overflow-y-auto">
                {events.map((event) => {
                  const isWrongSlot = event.eventType === "wrong_slot_open";
                  return (
                    <article
                      key={event.id}
                      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5"
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black ${
                          isWrongSlot
                            ? "bg-[#fff0ed] text-[#a44336]"
                            : "bg-[#e4f5ed] text-[#176a4c]"
                        }`}
                      >
                        {event.compartment}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">
                          {eventLabel(event)}
                        </p>
                        <p className="mt-1 truncate text-[11px] font-medium text-[#748078]">
                          {event.medication}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#6c786f]">
                        <Clock3 aria-hidden="true" size={12} />
                        {event.eventTime.slice(-5)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
