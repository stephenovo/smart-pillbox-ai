"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MousePointerClick,
  PackageOpen,
  Pill,
  RotateCw,
  ShieldCheck,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useIntegrationMode } from "../../src/hooks/useIntegrationMode";
import { SIMULATOR_DEVICE_ID } from "../../src/lib/hardwareProtocol";
import { initialMedicationSchedule } from "../../src/lib/sampleData";
import type {
  HardwareDeviceState,
  HardwareEventsApiResponse,
  HardwarePlanApiResponse,
  HardwarePlanSlot,
} from "../../src/types/hardware";
import type { OpeningEvent } from "../../src/types/pillbox";

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

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

type WrongSlotAlert = {
  expected: number;
  opened: number;
};

type TimeWarning = {
  slotId: number;
  expectedTime: string;
  openedTime: string;
  timing: "early" | "late";
};

function getCurrentTimeValue(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getTimeWarning(
  openedTime: string,
  slot: HardwarePlanSlot | null
): TimeWarning | null {
  if (!slot?.scheduledTime || !openedTime) return null;

  const delayMinutes =
    timeToMinutes(openedTime) - timeToMinutes(slot.scheduledTime);
  if (delayMinutes >= 0 && delayMinutes <= slot.bufferTimeMinutes) return null;

  return {
    slotId: slot.slotId,
    expectedTime: slot.scheduledTime,
    openedTime,
    timing: delayMinutes < 0 ? "early" : "late",
  };
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

function getSlotOpenCount(events: OpeningEvent[], slotId: number): number {
  return events.filter((event) => event.compartment === slotId).length;
}

function getOutcomeTone(event: OpeningEvent | null): string {
  if (event?.eventType === "wrong_slot_open") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (event) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function playWarningBuzzer(): void {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

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
  const integration = useIntegrationMode();
  const [plan, setPlan] = useState<HardwarePlanSlot[]>([]);
  const [events, setEvents] = useState<OpeningEvent[]>([]);
  const [deviceState, setDeviceState] = useState<HardwareDeviceState | null>(
    null
  );
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [openSlotIds, setOpenSlotIds] = useState<Set<number>>(new Set());
  const [wrongSlotAlert, setWrongSlotAlert] = useState<WrongSlotAlert | null>(
    null
  );
  const [timeWarning, setTimeWarning] = useState<TimeWarning | null>(null);
  const [liveTime, setLiveTime] = useState(getCurrentTimeValue);
  const [notice, setNotice] = useState("Tap a compartment to begin the demo");
  const wrongSlotTimerRef = useRef<number | null>(null);
  const timeWarningTimerRef = useRef<number | null>(null);

  const activeSlot = deviceState?.activeSlot ?? null;
  const isReminding = deviceState?.status === "reminding";
  const visualPlan = useMemo(() => getVisualPlan(plan), [plan]);
  const latestEvent = events[0] ?? null;

  const activeSlotPlan = useMemo(
    () => visualPlan.find((slot) => slot.slotId === selectedSlot) ?? null,
    [selectedSlot, visualPlan]
  );

  const expectedSlot = activeSlot ?? selectedSlot;
  const expectedSlotPlan = visualPlan.find((slot) => slot.slotId === expectedSlot);
  const latestIsWrong = latestEvent?.eventType === "wrong_slot_open";
  const latestEventPlan = latestEvent
    ? visualPlan.find((slot) => slot.slotId === latestEvent.compartment) ?? null
    : null;
  const latestTimeWarning =
    latestEvent?.eventType === "lid_open"
      ? getTimeWarning(latestEvent.eventTime.slice(-5), latestEventPlan)
      : null;
  const displayedTimeWarning = timeWarning ?? latestTimeWarning;
  const isShowcaseView = !isDemoMode;
  const isLinkedToSoftware = integration.mode === "simulator";

  const loadHardwareData = useCallback(async () => {
    const [planResponse, stateResponse, eventsResponse] = await Promise.all([
      fetch(`/api/hardware/plan?deviceId=${SIMULATOR_DEVICE_ID}`, {
        cache: "no-store",
      }),
      fetch(`/api/hardware/state?deviceId=${SIMULATOR_DEVICE_ID}&heartbeat=1`, {
        cache: "no-store",
      }),
      fetch(`/api/hardware/events?deviceId=${SIMULATOR_DEVICE_ID}&limit=12`, {
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
        if (isActive) setNotice("Tap a compartment to begin the demo");
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
    const clockIntervalId = window.setInterval(() => {
      setLiveTime(getCurrentTimeValue());
    }, 1000);

    return () => {
      window.clearInterval(clockIntervalId);
      if (wrongSlotTimerRef.current !== null) {
        window.clearTimeout(wrongSlotTimerRef.current);
      }
      if (timeWarningTimerRef.current !== null) {
        window.clearTimeout(timeWarningTimerRef.current);
      }
    };
  }, []);

  function triggerTimeWarning(warning: TimeWarning): void {
    playWarningBuzzer();
    setTimeWarning(warning);
    setNotice(
      `Wrong time. Expected ${warning.expectedTime}, opened ${warning.openedTime}.`
    );

    if (timeWarningTimerRef.current !== null) {
      window.clearTimeout(timeWarningTimerRef.current);
    }

    timeWarningTimerRef.current = window.setTimeout(() => {
      setTimeWarning(null);
      timeWarningTimerRef.current = null;
    }, 3000);
  }

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
    setIsDemoMode(true);
    const openedAt = new Date();
    const openedTime = getCurrentTimeValue(openedAt);
    const eventType =
      isReminding && activeSlot !== null && activeSlot !== slotId
        ? "wrong_slot_open"
        : "lid_open";

    if (eventType === "wrong_slot_open" && activeSlot !== null) {
      playWarningBuzzer();
      setTimeWarning(null);
      setWrongSlotAlert({ expected: activeSlot, opened: slotId });
      setNotice(
        `Wrong Slot Opened. Expected Slot ${activeSlot}, opened Slot ${slotId}.`
      );

      if (wrongSlotTimerRef.current !== null) {
        window.clearTimeout(wrongSlotTimerRef.current);
      }

      wrongSlotTimerRef.current = window.setTimeout(() => {
        setWrongSlotAlert(null);
        wrongSlotTimerRef.current = null;
      }, 5200);
    } else {
      setWrongSlotAlert(null);
      const slot = visualPlan.find((item) => item.slotId === slotId) ?? null;
      const warning = getTimeWarning(openedTime, slot);
      if (warning) {
        triggerTimeWarning(warning);
      } else {
        setTimeWarning(null);
      }
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
          deviceId: SIMULATOR_DEVICE_ID,
          slotId,
          eventType,
          source: "simulation",
          deviceTimestamp: openedAt.toISOString(),
          firmwareVersion,
        }),
      })
    );
  }

  function handleToggleSlotLid(slotId: number) {
    setIsDemoMode(true);
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
    setIsDemoMode(true);
    runMutation(`Reminder active on Slot ${slotId}`, () =>
      fetch("/api/hardware/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: SIMULATOR_DEVICE_ID,
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
          deviceId: SIMULATOR_DEVICE_ID,
          status: "idle",
          activeSlot: null,
        }),
      })
    );
  }

  function handleClearEvents() {
    setOpenSlotIds(new Set());
    setWrongSlotAlert(null);
    setTimeWarning(null);
    setIsDemoMode(false);
    if (timeWarningTimerRef.current !== null) {
      window.clearTimeout(timeWarningTimerRef.current);
      timeWarningTimerRef.current = null;
    }
    runMutation("Demo reset", async () => {
      const [eventsResponse, stateResponse] = await Promise.all([
        fetch(`/api/hardware/events?deviceId=${SIMULATOR_DEVICE_ID}`, {
          method: "DELETE",
        }),
        fetch("/api/hardware/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: SIMULATOR_DEVICE_ID,
            status: "idle",
            activeSlot: null,
          }),
        }),
      ]);
      return eventsResponse.ok ? stateResponse : eventsResponse;
    });
  }

  function handleScheduledTimeChange(nextTime: string) {
    const nextPlan = visualPlan.map((slot) =>
      slot.slotId === selectedSlot
        ? { ...slot, scheduledTime: nextTime }
        : slot
    );
    setPlan(nextPlan);

    const latestOpening = events.find(
      (event) =>
        event.compartment === selectedSlot && event.eventType === "lid_open"
    );
    const selectedPlan =
      nextPlan.find((slot) => slot.slotId === selectedSlot) ?? null;
    const warning = latestOpening
      ? getTimeWarning(latestOpening.eventTime.slice(-5), selectedPlan)
      : null;

    if (warning) {
      triggerTimeWarning(warning);
    } else {
      setTimeWarning(null);
    }

    void runMutation(`Slot ${selectedSlot} planned time updated`, () =>
      fetch("/api/hardware/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: SIMULATOR_DEVICE_ID,
          slots: nextPlan,
        }),
      })
    );
  }

  function handleResetPlan() {
    setIsDemoMode(true);
    runMutation("Demo medication plan restored", () =>
      fetch("/api/hardware/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: SIMULATOR_DEVICE_ID,
          slots: toHardwarePlan(),
        }),
      })
    );
  }

  const pillbox = (
    <section
      className={`transition-all duration-700 ease-out ${
        isDemoMode
          ? "w-full xl:sticky xl:top-6 xl:justify-self-stretch xl:origin-top"
          : "mx-auto w-full max-w-[1040px]"
      }`}
    >
      <div
        className={`relative rounded-[34px] border border-stone-200 bg-gradient-to-br from-white via-stone-50 to-teal-50 p-3 shadow-[0_28px_90px_rgba(15,23,42,0.16)] transition-all duration-700 sm:p-5 ${
          isDemoMode
            ? "scale-100"
            : "scale-100 shadow-[0_46px_110px_rgba(15,23,42,0.18)]"
        }`}
      >
        {isShowcaseView ? (
          <>
            <div className="pointer-events-none absolute bottom-[-2.2rem] left-14 h-1.5 w-44 rounded-full bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.35)]" />
            <div className="pointer-events-none absolute bottom-[-2.2rem] right-14 h-1.5 w-44 rounded-full bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.35)]" />
            <div className="pointer-events-none absolute inset-x-10 -bottom-16 h-12 rounded-[50%] bg-neutral-950/14 blur-2xl" />
          </>
        ) : null}

        <div className="relative overflow-hidden rounded-[30px] border border-white bg-[#fdfdfb] p-4 shadow-[inset_0_2px_16px_rgba(255,255,255,0.9),inset_0_-18px_34px_rgba(15,23,42,0.035)] sm:p-6">
          {isShowcaseView ? (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0)_38%,rgba(20,184,166,0.08)_100%)]" />
              <div className="pointer-events-none absolute left-10 right-20 top-6 h-px bg-white/90" />
            </>
          ) : null}

          {wrongSlotAlert ? (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-[0_0_24px_rgba(239,68,68,0.16)]">
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

          <div className="grid gap-3 sm:grid-cols-4">
            {visualPlan.map((slot) => {
              const isActiveSlot = activeSlot === slot.slotId;
              const isSelectedSlot = selectedSlot === slot.slotId;
              const isOpen = openSlotIds.has(slot.slotId);
              const openCount = getSlotOpenCount(events, slot.slotId);
              const isWrongLatest =
                latestEvent?.compartment === slot.slotId &&
                latestEvent.eventType === "wrong_slot_open";
              const pillStyle = pillStyles[(slot.slotId - 1) % pillStyles.length];
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

                  <div className="relative mt-4 h-[118px] rounded-[16px] border border-stone-300 bg-gradient-to-b from-white/80 to-stone-100 p-2 shadow-[inset_0_8px_18px_rgba(15,23,42,0.08),inset_0_-2px_10px_rgba(255,255,255,0.95)]">
                    {isShowcaseView ? (
                      <span className="pointer-events-none absolute inset-1 rounded-[15px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75),0_10px_18px_rgba(15,23,42,0.08)]" />
                    ) : null}
                    <div className="absolute inset-0">
                      {Array.from({ length: pillCount }).map((_, index) => (
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
                          ? "origin-top-left -translate-y-9 -rotate-12 opacity-90"
                          : "translate-y-0 rotate-0"
                      }`}
                    >
                      <span className="absolute inset-x-4 top-3 h-1 rounded-full bg-white/80" />
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white/90" />
                      {isShowcaseView ? (
                      <span className="absolute inset-0 rounded-[15px] bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(255,255,255,0.06)_48%,rgba(20,184,166,0.1))]" />
                      ) : null}
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

          <div className="mt-5 grid gap-4 md:grid-cols-[150px_minmax(260px,0.72fr)_1fr] md:items-center">
            <div className="grid w-fit grid-cols-10 gap-1 rounded-[18px] p-3">
              {Array.from({ length: 70 }).map((_, index) => (
                <span
                  key={`speaker-${index}`}
                  className="h-1.5 w-1.5 rounded-full bg-neutral-800/75"
                />
              ))}
            </div>

            <div className="flex min-h-[86px] items-center justify-between gap-4 rounded-[12px] bg-neutral-950 px-5 py-4 text-white shadow-inner">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400 text-neutral-950">
                  <Bell aria-hidden="true" size={20} />
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Next Reminder</p>
                  <p className="text-2xl font-bold">
                    {expectedSlotPlan?.scheduledTime || "12:30"}
                  </p>
                  <p className="text-xs font-semibold text-neutral-400">
                    Slot #{expectedSlot}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Battery</p>
                <p className="font-bold">100%</p>
              </div>
            </div>

            <div className="hidden h-16 rounded-[18px] border border-stone-200 bg-white shadow-inner md:block" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="h-1 w-36 rounded-full bg-teal-500" />
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-xs font-bold">
                AI
              </span>
              Smart Pillbox AI
            </div>
            <div className="h-1 w-36 rounded-full bg-teal-500" />
          </div>
        </div>
      </div>
    </section>
  );

  const demoConsole = (
    <section className="space-y-4 rounded-[24px] border border-stone-200 bg-white/95 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Simulator Demo Console
          </p>
          <h2 className="mt-2 text-2xl font-bold text-neutral-950">
            Hardware event drives care response
          </h2>
        </div>
        <button
          type="button"
          onClick={() => loadHardwareData()}
          disabled={isLoading || isMutating}
          className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCw aria-hidden="true" size={17} />
          Sync
        </button>
      </div>

      <section className="rounded-[18px] border border-stone-200 bg-gradient-to-br from-white via-stone-50 to-teal-50 p-4">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                <Pill aria-hidden="true" size={15} />
                Virtual Pillbox
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                {isLinkedToSoftware ? (
                  <Wifi
                    aria-hidden="true"
                    size={15}
                    className="text-teal-600"
                  />
                ) : (
                  <WifiOff
                    aria-hidden="true"
                    size={15}
                    className="text-red-500"
                  />
                )}
                {isLinkedToSoftware ? "linked to software" : "standalone"}
              </div>
            </div>

            <div
              className="mt-4 rounded-[22px] border border-white bg-[#fdfdfb] p-3 shadow-[inset_0_1px_12px_rgba(255,255,255,0.8),0_18px_34px_rgba(15,23,42,0.12)]"
              style={{ animation: "pillboxTopView 760ms ease-out both" }}
            >
              <div className="grid grid-cols-4 gap-2">
                {visualPlan.map((slot) => {
                  const isActiveSlot = activeSlot === slot.slotId;
                  const isSelectedSlot = selectedSlot === slot.slotId;
                  const isOpen = openSlotIds.has(slot.slotId);
                  const isWrongSlot =
                    latestEvent?.compartment === slot.slotId &&
                    latestEvent.eventType === "wrong_slot_open";
                  const pillStyle =
                    pillStyles[(slot.slotId - 1) % pillStyles.length];

                  return (
                    <button
                      key={`top-view-${slot.slotId}`}
                      type="button"
                      onClick={() => handleToggleSlotLid(slot.slotId)}
                      className={`relative h-20 overflow-hidden rounded-xl border bg-white text-left shadow-inner transition ${
                        isSelectedSlot
                          ? "border-teal-400 ring-2 ring-teal-100"
                          : "border-stone-200"
                      } ${
                        isActiveSlot
                          ? "shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                          : ""
                      } ${isWrongSlot ? "border-red-400 bg-red-50" : ""}`}
                    >
                      <span
                        className={`absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full ${
                          isWrongSlot
                            ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
                            : isActiveSlot
                              ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]"
                              : "bg-sky-300"
                        }`}
                      />
                      <span className="absolute left-2 top-3 text-sm font-bold text-teal-800">
                        {slot.slotId}
                      </span>
                      <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-1">
                        {Array.from({ length: isOpen ? (slot.medication ? 6 : 0) : 0 }).map(
                          (_, index) => (
                            <span
                              key={`top-pill-${slot.slotId}-${index}`}
                              className={`h-2.5 rounded-full border shadow-sm ${pillStyle.body}`}
                            />
                          )
                        )}
                      </div>
                      <span
                        className={`absolute inset-1 rounded-xl border border-white/80 bg-white/45 backdrop-blur-[1px] transition duration-500 ${
                          isOpen
                            ? "origin-top-left -translate-y-5 -rotate-6 opacity-80"
                            : ""
                        }`}
                      />
                      <span
                        className={`absolute bottom-1 left-1/2 h-3 w-10 -translate-x-1/2 rounded-t-lg border border-teal-500 bg-teal-400 ${
                          isOpen ? "bg-teal-500" : ""
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              displayedTimeWarning
                ? "border-red-200 bg-red-50 text-red-800"
                : getOutcomeTone(latestEvent)
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {displayedTimeWarning || latestIsWrong ? (
                <CircleAlert aria-hidden="true" size={15} />
              ) : (
                <ShieldCheck aria-hidden="true" size={15} />
              )}
              Live outcome
            </div>
            <p className="mt-2 text-sm font-bold">
              {displayedTimeWarning
                ? `Wrong time: expected ${displayedTimeWarning.expectedTime}, opened ${displayedTimeWarning.openedTime}`
                : wrongSlotAlert
                ? `Expected Slot ${wrongSlotAlert.expected}, opened Slot ${wrongSlotAlert.opened}`
                : latestIsWrong
                  ? `Wrong Slot Opened: Slot ${latestEvent?.compartment}`
                  : latestEvent
                    ? `Medication confirmed: Slot ${latestEvent.compartment}`
                    : "Waiting for patient action"}
            </p>
            <p className="mt-1 text-xs opacity-75">{notice}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/70 p-2">
                <p className="opacity-60">Selected</p>
                <p className="font-bold">Slot {selectedSlot}</p>
              </div>
              <div className="rounded-lg bg-white/70 p-2">
                <p className="opacity-60">Lid</p>
                <p className="font-bold">
                  {openSlotIds.has(selectedSlot) ? "Open" : "Closed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Bell aria-hidden="true" size={21} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-950">Guided Demo Flow</h3>
              <p className="text-sm text-neutral-500">
                Start reminder, open a lid, then review the result.
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isReminding
                ? "bg-sky-100 text-sky-800"
                : "bg-white text-neutral-600"
            }`}
          >
            {deviceState?.status ?? "loading"}
          </span>
        </div>

        <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-3">
          <div className="flex min-h-[300px] flex-col rounded-lg border border-stone-200 bg-white p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">
              1
            </span>
            <p className="mt-3 font-bold text-neutral-950">Start Reminder</p>
            <p className="mt-1 min-h-10 text-sm text-neutral-600">
              Slot {selectedSlot} · {activeSlotPlan?.medication || "Empty slot"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-xs font-semibold text-neutral-500">
                Current time
                <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2 text-sm font-bold text-neutral-950">
                  <Clock3 aria-hidden="true" size={15} className="text-teal-600" />
                  <time dateTime={liveTime}>{liveTime}</time>
                </div>
              </div>
              <label className="text-xs font-semibold text-neutral-500">
                Planned time
                <select
                  value={activeSlotPlan?.scheduledTime ?? ""}
                  onChange={(event) =>
                    handleScheduledTimeChange(event.target.value)
                  }
                  disabled={!activeSlotPlan?.medication}
                  className="mt-1 h-10 w-full rounded-md border border-stone-200 bg-stone-50 px-2 text-sm font-bold text-neutral-950 outline-none focus:border-teal-400 disabled:opacity-50"
                >
                  {!activeSlotPlan?.scheduledTime ? (
                    <option value="">--:--</option>
                  ) : null}
                  {timeOptions.map((time) => (
                    <option key={`plan-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => handleStartReminder(selectedSlot)}
              disabled={isMutating}
              className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bell aria-hidden="true" size={17} />
              Start
            </button>
          </div>

          <div className="flex min-h-[300px] flex-col rounded-lg border border-stone-200 bg-white p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              2
            </span>
            <p className="mt-3 font-bold text-neutral-950">Open Lid</p>
            <p className="mt-1 min-h-10 text-sm text-neutral-600">
              Expected Slot {expectedSlot}
            </p>
            <div className="mt-auto space-y-2 pt-3">
              <button
                type="button"
                onClick={() => handleOpenSlot(expectedSlot)}
                disabled={isMutating}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PackageOpen aria-hidden="true" size={17} />
                <span className="whitespace-nowrap">Open Lid</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleOpenSlot(activeSlot === 1 ? 3 : activeSlot ? 1 : 3)
                }
                disabled={isMutating || !isReminding}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CircleAlert aria-hidden="true" size={17} />
                Wrong Slot
              </button>
            </div>
          </div>

          <div
            className={`flex min-h-[300px] flex-col rounded-lg border p-4 ${
              displayedTimeWarning || wrongSlotAlert
                ? "border-red-200 bg-red-50"
                : latestEvent
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-stone-200 bg-white"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
                displayedTimeWarning || wrongSlotAlert
                  ? "bg-red-600"
                  : "bg-emerald-600"
              }`}
            >
              3
            </span>
            <p className="mt-3 font-bold text-neutral-950">Review Result</p>
            <p className="mt-1 min-h-10 text-sm text-neutral-700">
              {displayedTimeWarning
                ? `Wrong Time: expected ${displayedTimeWarning.expectedTime}, opened ${displayedTimeWarning.openedTime}.`
                : wrongSlotAlert
                ? `Wrong Slot Opened: expected Slot ${wrongSlotAlert.expected}, opened Slot ${wrongSlotAlert.opened}.`
                : latestEvent
                  ? `Latest event: Slot ${latestEvent.compartment} ${latestEvent.eventType}.`
                  : "Waiting for patient action."}
            </p>
            <div className="mt-auto flex gap-2 pt-3">
              <button
                type="button"
                onClick={handleStopReminder}
                disabled={isMutating || !isReminding}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BellOff aria-hidden="true" size={17} />
                Stop
              </button>
              <button
                type="button"
                onClick={handleClearEvents}
                disabled={isMutating}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" size={17} />
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                wrongSlotAlert || latestIsWrong
                  ? "bg-red-50 text-red-700"
                  : latestEvent
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-sky-50 text-sky-700"
              }`}
            >
              {wrongSlotAlert || latestIsWrong ? (
                <CircleAlert aria-hidden="true" size={21} />
              ) : latestEvent ? (
                <PackageOpen aria-hidden="true" size={21} />
              ) : (
                <Clock3 aria-hidden="true" size={21} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-neutral-950">Caregiver Timeline</h3>
              <p className="text-sm text-neutral-500">
                Patient action translated into a care signal.
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
          className={`mt-4 rounded-lg border p-4 ${
            displayedTimeWarning
              ? "border-red-200 bg-red-50 text-red-800"
              : getOutcomeTone(latestEvent)
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Caregiver alert
          </p>
          <h4 className="mt-2 text-xl font-bold">
            {displayedTimeWarning
              ? "Wrong time risk"
              : wrongSlotAlert || latestIsWrong
              ? "Wrong medication risk"
              : latestEvent
                ? "Medication confirmed"
                : "Waiting for patient action"}
          </h4>
          <p className="mt-2 text-sm opacity-80">
            {displayedTimeWarning
              ? `Expected ${displayedTimeWarning.expectedTime}, opened at ${displayedTimeWarning.openedTime}. ${
                  timeWarning
                    ? "Visual and buzzer warnings are active."
                    : "Warning recorded in the caregiver timeline."
                }`
              : wrongSlotAlert
              ? `Expected Slot ${wrongSlotAlert.expected}, opened Slot ${wrongSlotAlert.opened}. Buzzer warning is active.`
              : latestIsWrong
                ? `Wrong slot opening recorded for Slot ${latestEvent?.compartment}.`
                : latestEvent
                  ? `Slot ${latestEvent.compartment} opened and uploaded successfully.`
                  : "Interact with the pillbox or guided flow to generate an outcome."}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-neutral-500">
              No timeline event yet.
            </div>
          ) : (
            events.slice(0, 5).map((event) => {
              const isWrongEvent = event.eventType === "wrong_slot_open";
              const eventPlan = visualPlan.find(
                (slot) => slot.slotId === event.compartment
              );
              const eventTimeWarning =
                event.eventType === "lid_open"
                  ? getTimeWarning(event.eventTime.slice(-5), eventPlan ?? null)
                  : null;
              const isAlertEvent = isWrongEvent || eventTimeWarning !== null;

              return (
                <article
                  key={event.id}
                  className="relative rounded-lg border border-stone-200 bg-stone-50 p-3 pl-10"
                >
                  <span
                    className={`absolute left-3 top-4 h-3 w-3 rounded-full ${
                      isAlertEvent ? "bg-red-500" : "bg-emerald-500"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-neutral-950">
                        {isWrongEvent
                          ? "Wrong Slot Opened"
                          : eventTimeWarning
                            ? "Wrong Time Opened"
                          : "Medication confirmed"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {isWrongEvent
                          ? `Expected Slot ${event.activeSlotAtEvent ?? expectedSlot}, opened Slot ${event.compartment}.`
                          : eventTimeWarning
                            ? `Expected ${eventTimeWarning.expectedTime}, opened at ${eventTimeWarning.openedTime}.`
                          : `Patient opened Slot ${event.compartment} for ${event.medication}.`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        isAlertEvent
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {isAlertEvent ? "Alert" : "Safe"}
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
      </section>
    </section>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5f1] text-neutral-950">
      <style>
        {`
          @keyframes pillboxTopView {
            0% {
              opacity: 0;
              transform: perspective(760px) rotateX(18deg) translateY(18px) scale(0.96);
            }
            100% {
              opacity: 1;
              transform: perspective(760px) rotateX(0deg) translateY(0) scale(1);
            }
          }
          @keyframes pageWarningFlash {
            0%, 100% { opacity: 0.08; }
            50% { opacity: 0.52; }
          }
          @keyframes warningMarkFlash {
            0%, 100% { opacity: 0.55; transform: scale(0.92); }
            50% { opacity: 1; transform: scale(1.06); }
          }
          .page-warning-flash {
            animation: pageWarningFlash 0.5s steps(2, end) 6;
          }
          .warning-mark-flash {
            animation: warningMarkFlash 0.5s steps(2, end) 6;
          }
        `}
      </style>
      {timeWarning ? (
        <div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="page-warning-flash absolute inset-0 bg-red-600 shadow-[inset_0_0_160px_rgba(127,29,29,0.95)]" />
          <div className="warning-mark-flash relative flex max-w-[min(88vw,460px)] flex-col items-center text-center text-white drop-shadow-[0_8px_30px_rgba(127,29,29,0.95)]">
            <span className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-red-700 shadow-[0_0_50px_rgba(255,255,255,0.7)]">
              <CircleAlert aria-hidden="true" size={68} strokeWidth={2.4} />
            </span>
            <p className="mt-5 text-3xl font-black">Wrong Time</p>
            <p className="mt-2 text-lg font-bold">
              Expected {timeWarning.expectedTime} · Opened {timeWarning.openedTime}
            </p>
          </div>
        </div>
      ) : null}
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.95),rgba(247,245,241,0)_38%)]">
        <header
          className={`mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-5 transition-all duration-700 sm:px-7 lg:px-10 ${
            isDemoMode ? "border-b border-stone-200 bg-white/70 backdrop-blur" : ""
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Smart Pillbox AI
            </p>
            <h1 className="mt-2 text-2xl font-bold text-neutral-950 lg:text-3xl">
              Hardware Showcase
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm text-neutral-700 shadow-sm">
              {isLinkedToSoftware ? (
                <Wifi aria-hidden="true" size={18} className="text-teal-600" />
              ) : (
                <WifiOff aria-hidden="true" size={18} className="text-red-500" />
              )}
              <span>{isLinkedToSoftware ? "Linked" : "Standalone"}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                void integration.setMode(
                  isLinkedToSoftware ? "standalone" : "simulator"
                )
              }
              disabled={integration.isChangingMode}
              className="flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isLinkedToSoftware ? <WifiOff size={17} /> : <Wifi size={17} />}
              <span className="hidden sm:inline">
                {isLinkedToSoftware ? "Disconnect" : "Connect simulator"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleResetPlan}
              disabled={isMutating}
              className="hidden h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex"
            >
              <RotateCw aria-hidden="true" size={17} />
              Reset plan
            </button>
          </div>
        </header>

        <div
          className={`mx-auto grid w-full max-w-[1440px] gap-6 px-4 pb-10 pt-4 transition-all duration-700 sm:px-7 lg:px-10 ${
            isDemoMode
              ? "xl:grid-cols-2 xl:items-start"
              : "min-h-[calc(100vh-112px)] place-items-center"
          }`}
        >
          {isDemoMode ? demoConsole : null}

          <div className={isDemoMode ? "xl:order-2" : ""}>
            {!isDemoMode ? (
              <div className="mb-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Digital hardware twin
                </p>
                <h2 className="mt-3 text-4xl font-bold text-neutral-950 lg:text-5xl">
                  Tap the pillbox to start
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                  Open any compartment to reveal the demo console and
                  turn a physical action into caregiver-facing feedback.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800">
                  <MousePointerClick
                    aria-hidden="true"
                    size={20}
                    className="animate-pulse"
                  />
                  <span>Click one to open the lid</span>
                </div>
              </div>
            ) : null}
            {pillbox}
          </div>
        </div>
      </div>
    </main>
  );
}
