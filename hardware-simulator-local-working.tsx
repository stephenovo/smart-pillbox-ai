"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CircleAlert,
  Clock3,
  LoaderCircle,
  PackageOpen,
  Pill,
  RotateCw,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { DEMO_DEVICE_ID } from "./src/lib/hardwareProtocol";
import { initialMedicationSchedule } from "./src/lib/sampleData";
import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
  HardwarePlanSlot,
} from "./src/types/hardware";
import type { OpeningEvent } from "./src/types/pillbox";

const firmwareVersion = "web-hardware-simulator-1.0.0";

const pillStyles = [
  {
    shape: "tablet",
    body: "border-stone-200 bg-gradient-to-br from-white via-stone-50 to-stone-200",
    half: "bg-stone-100",
    shine: "bg-white",
  },
  {
    shape: "capsule",
    body: "border-amber-500 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400",
    half: "bg-yellow-100",
    shine: "bg-yellow-50",
  },
  {
    shape: "capsule",
    body: "border-red-700 bg-gradient-to-r from-red-600 via-red-400 to-red-700",
    half: "bg-red-200",
    shine: "bg-red-100",
  },
  {
    shape: "tablet",
    body: "border-sky-400 bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500",
    half: "bg-sky-100",
    shine: "bg-white",
  },
  {
    shape: "tablet",
    body: "border-orange-400 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400",
    half: "bg-orange-100",
    shine: "bg-orange-50",
  },
  {
    shape: "capsule",
    body: "border-emerald-700 bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-600",
    half: "bg-emerald-200",
    shine: "bg-emerald-100",
  },
  {
    shape: "tablet",
    body: "border-stone-500 bg-gradient-to-br from-stone-300 via-stone-400 to-stone-500",
    half: "bg-stone-200",
    shine: "bg-white",
  },
  {
    shape: "softgel",
    body: "border-yellow-600 bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500",
    half: "bg-yellow-100",
    shine: "bg-yellow-50",
  },
];

const pillLayout = [
  { left: "12%", top: "64%", rotate: "-8deg", scale: 1 },
  { left: "34%", top: "58%", rotate: "7deg", scale: 0.92 },
  { left: "55%", top: "66%", rotate: "-2deg", scale: 1.06 },
  { left: "24%", top: "78%", rotate: "11deg", scale: 0.96 },
  { left: "47%", top: "79%", rotate: "-13deg", scale: 0.9 },
  { left: "68%", top: "77%", rotate: "8deg", scale: 0.98 },
  { left: "69%", top: "58%", rotate: "-9deg", scale: 0.88 },
  { left: "14%", top: "48%", rotate: "5deg", scale: 0.84 },
  { left: "42%", top: "48%", rotate: "-5deg", scale: 0.88 },
];

type WrongSlotAlert = {
  expected: number;
  opened: number;
};

function formatClock(isoDate: string | null): string {
  if (!isoDate) return "Never";

  return new Intl.DateTimeFormat("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoDate));
}

function getEventTone(event: OpeningEvent): string {
  if (event.eventType === "wrong_slot_open") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getSlotOpenCount(events: OpeningEvent[], slotId: number): number {
  return events.filter((event) => event.compartment === slotId).length;
}

function getVisualPlan(plan: HardwarePlanSlot[]): HardwarePlanSlot[] {
  return Array.from({ length: 8 }, (_, index) => {
    const slotId = index + 1;
    return (
      plan.find((slot) => slot.slotId === slotId) ?? {
        slotId,
        medication: "",
        scheduledTime: "",
        highRisk: false,
        bufferTimeMinutes: 60,
      }
    );
  });
}

function playWrongSlotBuzzer(): void {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;

  [0, 0.19].forEach((delay) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880, now + delay);
    oscillator.frequency.linearRampToValueAtTime(720, now + delay + 0.11);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.16, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.13);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + 0.14);
  });

  window.setTimeout(() => {
    audioContext.close().catch(() => undefined);
  }, 520);
}

function toHardwarePlan(): HardwarePlanSlot[] {
  return initialMedicationSchedule.map((item) => ({
    slotId: item.compartment,
    medication: item.medication,
    scheduledTime: item.scheduledTime,
    highRisk: item.highRisk,
    bufferTimeMinutes: item.bufferTimeMinutes,
  }));
}

export default function HardwareSimulatorPage() {
  const [plan, setPlan] = useState<HardwarePlanSlot[]>([]);
  const [events, setEvents] = useState<OpeningEvent[]>([]);
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [openSlotIds, setOpenSlotIds] = useState<Set<number>>(new Set());
  const [wrongSlotAlert, setWrongSlotAlert] = useState<WrongSlotAlert | null>(
    null
  );
  const [notice, setNotice] = useState("Simulator ready");
  const wrongSlotTimerRef = useRef<number | null>(null);

  const activeSlot = deviceState?.activeSlot ?? null;
  const isReminding = deviceState?.status === "reminding";

  const activeSlotPlan = useMemo(
    () =>
      getVisualPlan(plan).find((slot) => slot.slotId === selectedSlot) ?? null,
    [plan, selectedSlot]
  );

  const visualPlan = useMemo(() => getVisualPlan(plan), [plan]);

  const latestEvent = events[0] ?? null;

  const loadHardwareData = useCallback(async () => {
    const [planResponse, stateResponse, eventsResponse] = await Promise.all([
      fetch(`/api/hardware/plan?deviceId=${DEMO_DEVICE_ID}`, {
        cache: "no-store",
      }),
      fetch(`/api/hardware/state?deviceId=${DEMO_DEVICE_ID}&heartbeat=1`, {
        cache: "no-store",
      }),
      fetch(`/api/hardware/events?deviceId=${DEMO_DEVICE_ID}&limit=12`, {
        cache: "no-store",
      }),
    ]);

    if (!planResponse.ok || !stateResponse.ok || !eventsResponse.ok) {
      throw new Error("Hardware API unavailable.");
    }

    const planData = (await planResponse.json()) as HardwarePlanApiResponse;
    const stateData = (await stateResponse.json()) as HardwareDeviceState;
    const eventsData = (await eventsResponse.json()) as HardwareEventsApiResponse;

    setPlan(planData.slots);
    setDeviceState(stateData);
    setEvents(eventsData.events);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadInitialState() {
      try {
        await loadHardwareData();
        if (isActive) setNotice("Connected to local hardware API");
      } catch (error) {
        if (isActive) {
          setNotice(error instanceof Error ? error.message : "Load failed");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadInitialState();
    const intervalId = window.setInterval(() => {
      loadHardwareData().catch(() => {
        setNotice("Hardware API refresh failed");
      });
    }, 2500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [loadHardwareData]);

  useEffect(() => {
    return () => {
      if (wrongSlotTimerRef.current !== null) {
        window.clearTimeout(wrongSlotTimerRef.current);
      }
    };
  }, []);

  async function runMutation(
    label: string,
    mutation: () => Promise<Response>
  ): Promise<void> {
    setIsMutating(true);

    try {
      const response = await mutation();
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `${label} failed`);
      }

      await loadHardwareData();
      setNotice(label);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setIsMutating(false);
    }
  }

  function handleOpenSlot(slotId: number) {
    const eventType =
      isReminding && activeSlot !== null && activeSlot !== slotId
        ? "wrong_slot_open"
        : "lid_open";

    if (eventType === "wrong_slot_open" && activeSlot !== null) {
      playWrongSlotBuzzer();
      setWrongSlotAlert({ expected: activeSlot, opened: slotId });
      setNotice(`Wrong Slot Opened. Expected Slot ${activeSlot}, opened Slot ${slotId}.`);

      if (wrongSlotTimerRef.current !== null) {
        window.clearTimeout(wrongSlotTimerRef.current);
      }

      wrongSlotTimerRef.current = window.setTimeout(() => {
        setWrongSlotAlert(null);
        wrongSlotTimerRef.current = null;
      }, 5200);
    } else {
      setWrongSlotAlert(null);
    }

    setOpenSlotIds((currentSlotIds) => {
      const nextSlotIds = new Set(currentSlotIds);
      nextSlotIds.add(slotId);
      return nextSlotIds;
    });

    runMutation(`Slot ${slotId} opening uploaded`, () =>
      fetch("/api/hardware/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          slotId,
          eventType,
          deviceTimestamp: new Date().toISOString(),
          firmwareVersion,
        }),
      })
    );
  }

  function handleToggleSlotLid(slotId: number) {
    setSelectedSlot(slotId);

    if (openSlotIds.has(slotId)) {
      setOpenSlotIds((currentSlotIds) => {
        const nextSlotIds = new Set(currentSlotIds);
        nextSlotIds.delete(slotId);
        return nextSlotIds;
      });
      setNotice(`Slot ${slotId} lid closed`);
      return;
    }

    handleOpenSlot(slotId);
  }

  function handleStartReminder(slotId: number) {
    runMutation(`Reminder active on Slot ${slotId}`, () =>
      fetch("/api/hardware/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          status: "reminding",
          activeSlot: slotId,
        }),
      })
    );
  }

  function handleStopReminder() {
    runMutation("Reminder stopped", () =>
      fetch("/api/hardware/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          status: "idle",
          activeSlot: null,
        }),
      })
    );
  }

  function handleClearEvents() {
    runMutation("Hardware events cleared", () =>
      fetch(`/api/hardware/events?deviceId=${DEMO_DEVICE_ID}`, {
        method: "DELETE",
      })
    );
  }

  function handleResetPlan() {
    runMutation("Demo medication plan restored", () =>
      fetch("/api/hardware/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: DEMO_DEVICE_ID,
          slots: toHardwarePlan(),
        }),
      })
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Smart Pillbox AI
            </p>
            <h1 className="mt-2 text-2xl font-bold text-neutral-950 lg:text-3xl">
              Hardware Simulator
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm text-neutral-700">
              {deviceState?.connectionStatus === "connected" ? (
                <Wifi aria-hidden="true" size={18} className="text-teal-600" />
              ) : (
                <WifiOff aria-hidden="true" size={18} className="text-red-500" />
              )}
              <span>{deviceState?.connectionStatus ?? "loading"}</span>
            </div>
            <button
              type="button"
              onClick={() => loadHardwareData()}
              disabled={isLoading || isMutating}
              className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw aria-hidden="true" size={17} />
              Refresh
            </button>
          </div>
        </header>

        <section className="space-y-5 py-5">
          <div className="space-y-5">
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Pill aria-hidden="true" size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-950">
                      Virtual slots
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {DEMO_DEVICE_ID}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResetPlan}
                    disabled={isMutating}
                    className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCw aria-hidden="true" size={17} />
                    Reset plan
                  </button>
                  <button
                    type="button"
                    onClick={handleClearEvents}
                    disabled={isMutating || events.length === 0}
                    className="flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                    Clear
                  </button>
                </div>
              </div>

              {wrongSlotAlert ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-[0_0_24px_rgba(239,68,68,0.16)]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                    <Volume2 aria-hidden="true" size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold">Wrong Slot Opened</p>
                    <p className="mt-1 text-sm">
                      Expected Slot {wrongSlotAlert.expected}, opened Slot{" "}
                      {wrongSlotAlert.opened}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-[28px] border border-stone-200 bg-gradient-to-br from-white via-stone-50 to-teal-50 p-3 shadow-[0_22px_70px_rgba(15,23,42,0.12)] sm:p-5">
                <div className="rounded-[24px] border border-white bg-[#fdfdfb] p-4 shadow-inner sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {visualPlan.map((slot) => {
                      const isActiveSlot = activeSlot === slot.slotId;
                      const isSelectedSlot = selectedSlot === slot.slotId;
                      const isOpen = openSlotIds.has(slot.slotId);
                      const openCount = getSlotOpenCount(events, slot.slotId);
                      const isWrongLatest =
                        latestEvent?.compartment === slot.slotId &&
                        latestEvent.eventType === "wrong_slot_open";
                      const pillStyle =
                        pillStyles[(slot.slotId - 1) % pillStyles.length];
                      const pillCount = slot.medication
                        ? slot.slotId === 8
                          ? 7
                          : 9
                        : 0;

                      return (
                        <button
                          key={slot.slotId}
                          type="button"
                          onClick={() => handleToggleSlotLid(slot.slotId)}
                          className={`group relative min-h-[168px] overflow-visible rounded-[18px] border bg-white/80 p-2 text-left transition duration-300 ${
                            isSelectedSlot
                              ? "border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.18)]"
                              : "border-stone-200 hover:border-teal-200"
                          } ${
                            isActiveSlot
                              ? "animate-pulse shadow-[0_0_26px_rgba(14,165,233,0.45)]"
                              : ""
                          } ${
                            isWrongLatest
                              ? "border-red-400 bg-red-50 shadow-[0_0_28px_rgba(239,68,68,0.36)]"
                              : ""
                          }`}
                        >
                          <span
                            className={`absolute left-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-full transition ${
                              isWrongLatest
                                ? "animate-pulse bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.95)]"
                                : isActiveSlot
                                  ? "animate-pulse bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.95)]"
                                  : "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.75)]"
                            }`}
                          />

                          <div className="relative mt-4 h-[118px] rounded-[16px] border border-stone-300 bg-gradient-to-b from-white/80 to-stone-100 p-2 shadow-inner">
                            <div className="absolute inset-0">
                              {Array.from({
                                length: pillCount,
                              }).map((_, index) => (
                                <span
                                  key={`${slot.slotId}-${index}`}
                                  className={`absolute block border shadow-[0_4px_7px_rgba(15,23,42,0.22)] ${
                                    pillStyle.body
                                  } ${
                                    pillStyle.shape === "softgel"
                                      ? "h-7 w-4 rounded-full"
                                      : pillStyle.shape === "capsule"
                                        ? "h-4 w-9 rounded-full"
                                        : "h-5 w-5 rounded-full"
                                  }`}
                                  style={{
                                    left: pillLayout[index].left,
                                    top: pillLayout[index].top,
                                    transform: `translate(-50%, -50%) rotate(${pillLayout[index].rotate}) scale(${pillLayout[index].scale})`,
                                  }}
                                >
                                  {pillStyle.shape === "capsule" ? (
                                    <span className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
                                  ) : null}
                                  <span
                                    className={`absolute left-1 top-1 h-1.5 w-3 rounded-full opacity-75 blur-[0.2px] ${pillStyle.shine}`}
                                  />
                                  <span
                                    className={`absolute bottom-0.5 right-1 h-1 w-2 rounded-full opacity-60 ${pillStyle.half}`}
                                  />
                                </span>
                              ))}
                            </div>

                            <span className="absolute inset-x-0 top-9 text-center text-2xl font-semibold text-teal-800">
                              {slot.slotId}
                            </span>

                            <div
                              className={`absolute inset-1 rounded-[15px] border border-white/80 bg-white/45 shadow-[inset_0_1px_14px_rgba(255,255,255,0.75),0_7px_18px_rgba(15,23,42,0.13)] backdrop-blur-[2px] transition duration-500 ease-out ${
                                isOpen
                                  ? "origin-top-left -translate-y-8 -rotate-12 opacity-90"
                                  : "translate-y-0 rotate-0"
                              }`}
                            >
                              <span className="absolute inset-x-4 top-3 h-1 rounded-full bg-white/80" />
                              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white/90" />
                            </div>

                            <span
                              className={`absolute bottom-1 left-1/2 h-5 w-14 -translate-x-1/2 rounded-t-xl border border-teal-500 bg-teal-400 shadow-sm transition ${
                                isOpen ? "translate-y-1 bg-teal-500" : ""
                              }`}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-neutral-950">
                                {slot.medication || "Empty slot"}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {slot.scheduledTime || "--:--"} · {openCount} opens
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                isOpen
                                  ? "bg-teal-100 text-teal-800"
                                  : "bg-stone-100 text-neutral-600"
                              }`}
                            >
                              {isOpen ? "open" : "closed"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 rounded-[18px] bg-neutral-950 p-4 text-white shadow-inner sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400 text-neutral-950">
                        <Bell aria-hidden="true" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Next Reminder</p>
                        <p className="text-xl font-bold">
                          {activeSlotPlan?.scheduledTime || "12:30"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-5 text-sm">
                      <div>
                        <p className="text-xs text-neutral-400">Selected</p>
                        <p className="font-bold">Slot {selectedSlot}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Lid</p>
                        <p className="font-bold">
                          {openSlotIds.has(selectedSlot) ? "Open" : "Closed"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Battery</p>
                        <p className="font-bold">100%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="h-1 w-32 rounded-full bg-teal-400" />
                    <p className="text-sm font-semibold text-teal-800">
                      Smart Pillbox AI
                    </p>
                    <div className="h-1 w-32 rounded-full bg-teal-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
              <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Bell aria-hidden="true" size={21} />
                    </div>
                    <div>
                      <h2 className="font-bold text-neutral-950">
                        Guided Demo Flow
                      </h2>
                      <p className="text-sm text-neutral-500">
                        Run the story in three clear steps.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isReminding
                        ? "bg-sky-100 text-sky-800"
                        : "bg-stone-100 text-neutral-600"
                    }`}
                  >
                    {deviceState?.status ?? "loading"}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">
                        1
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-neutral-950">
                          Choose reminder slot
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Slot {selectedSlot} ·{" "}
                          {activeSlotPlan?.medication || "Empty slot"} ·{" "}
                          {activeSlotPlan?.scheduledTime || "--:--"}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartReminder(selectedSlot)}
                          disabled={isMutating}
                          className="mt-3 flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Bell aria-hidden="true" size={17} />
                          Start Reminder
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                        2
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-neutral-950">
                          Open a lid
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Expected action: open Slot {activeSlot ?? selectedSlot}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSlot(activeSlot ?? selectedSlot)
                            }
                            disabled={isMutating}
                            className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <PackageOpen aria-hidden="true" size={17} />
                            Open Correct Lid
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSlot(
                                activeSlot === 1 ? 3 : activeSlot ? 1 : 3
                              )
                            }
                            disabled={isMutating || !isReminding}
                            className="flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CircleAlert aria-hidden="true" size={17} />
                            Simulate Wrong Slot
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg border p-4 ${
                      wrongSlotAlert
                        ? "border-red-200 bg-red-50"
                        : latestEvent
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                          wrongSlotAlert ? "bg-red-600" : "bg-emerald-600"
                        }`}
                      >
                        3
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-neutral-950">
                          Review result
                        </p>
                        <p className="mt-1 text-sm text-neutral-700">
                          {wrongSlotAlert
                            ? `Wrong Slot Opened: expected Slot ${wrongSlotAlert.expected}, opened Slot ${wrongSlotAlert.opened}.`
                            : latestEvent
                              ? `Latest event: Slot ${latestEvent.compartment} ${latestEvent.eventType}.`
                              : "Waiting for patient action."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleStopReminder}
                            disabled={isMutating || !isReminding}
                            className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <BellOff aria-hidden="true" size={17} />
                            Stop Alert
                          </button>
                          <button
                            type="button"
                            onClick={handleClearEvents}
                            disabled={isMutating || events.length === 0}
                            className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 aria-hidden="true" size={17} />
                            Reset Demo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        wrongSlotAlert ||
                        latestEvent?.eventType === "wrong_slot_open"
                          ? "bg-red-50 text-red-700"
                          : latestEvent
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {wrongSlotAlert ||
                      latestEvent?.eventType === "wrong_slot_open" ? (
                        <CircleAlert aria-hidden="true" size={21} />
                      ) : latestEvent ? (
                        <PackageOpen aria-hidden="true" size={21} />
                      ) : (
                        <Clock3 aria-hidden="true" size={21} />
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-neutral-950">
                        Caregiver Alert Stream
                      </h2>
                      <p className="text-sm text-neutral-500">
                        What the caregiver sees in real time.
                      </p>
                    </div>
                  </div>
                  {isMutating ? (
                    <LoaderCircle
                      aria-hidden="true"
                      size={20}
                      className="animate-spin text-teal-600"
                    />
                  ) : null}
                </div>

                <div
                  className={`mt-5 rounded-lg border p-4 ${
                    wrongSlotAlert ||
                    latestEvent?.eventType === "wrong_slot_open"
                      ? "border-red-200 bg-red-50"
                      : latestEvent
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-sky-200 bg-sky-50"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      wrongSlotAlert ||
                      latestEvent?.eventType === "wrong_slot_open"
                        ? "text-red-700"
                        : latestEvent
                          ? "text-emerald-700"
                          : "text-sky-700"
                    }`}
                  >
                    Live caregiver alert
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-neutral-950">
                    {wrongSlotAlert ||
                    latestEvent?.eventType === "wrong_slot_open"
                      ? "Wrong medication risk"
                      : latestEvent
                        ? "Medication confirmed"
                        : "Waiting for patient action"}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-700">
                    {wrongSlotAlert
                      ? `Expected Slot ${wrongSlotAlert.expected}, opened Slot ${wrongSlotAlert.opened}. Buzzer warning is active.`
                      : latestEvent?.eventType === "wrong_slot_open"
                        ? `A wrong slot opening was recorded for Slot ${latestEvent.compartment}.`
                        : latestEvent
                          ? `Slot ${latestEvent.compartment} opened and uploaded successfully.`
                          : "Start a reminder, then open a lid to generate a caregiver-facing outcome."}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs text-neutral-500">Expected</p>
                    <p className="mt-1 font-bold text-neutral-950">
                      Slot {activeSlot ?? selectedSlot}
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs text-neutral-500">Opened</p>
                    <p className="mt-1 font-bold text-neutral-950">
                      {latestEvent ? `Slot ${latestEvent.compartment}` : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs text-neutral-500">Last seen</p>
                    <p className="mt-1 font-bold text-neutral-950">
                      {formatClock(deviceState?.lastSeenAt ?? null)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-neutral-950">
                      Outcome timeline
                    </h3>
                    <span className="text-xs text-neutral-500">
                      {events.length} events
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {events.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-neutral-500">
                        No patient action yet.
                      </div>
                    ) : (
                      events.slice(0, 5).map((event) => {
                        const isWrongEvent =
                          event.eventType === "wrong_slot_open";

                        return (
                          <article
                            key={event.id}
                            className="relative rounded-lg border border-stone-200 bg-stone-50 p-3 pl-10"
                          >
                            <span
                              className={`absolute left-3 top-4 h-3 w-3 rounded-full ${
                                isWrongEvent ? "bg-red-500" : "bg-emerald-500"
                              }`}
                            />
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-neutral-950">
                                  {isWrongEvent
                                    ? "Warning triggered"
                                    : "Medication confirmed"}
                                </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {isWrongEvent
                                    ? `Patient opened Slot ${event.compartment}; expected Slot ${event.activeSlotAtEvent ?? activeSlot ?? selectedSlot}.`
                                    : `Patient opened Slot ${event.compartment} for ${event.medication}.`}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-2 py-1 text-xs font-semibold ${getEventTone(
                                  event
                                )}`}
                              >
                                {isWrongEvent ? "Risk" : "Safe"}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                              <Clock3 aria-hidden="true" size={14} />
                              <span>{event.eventTime}</span>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-neutral-700">
                  {isLoading ? "Loading simulator" : notice}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
