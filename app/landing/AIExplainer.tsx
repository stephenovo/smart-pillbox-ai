"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Lock,
  MessageCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./ai-explainer.module.css";

type WalkthroughItem = {
  icon: LucideIcon;
  label: string;
  title: string;
  copy: string;
};

const architecture: WalkthroughItem[] = [
  {
    icon: Radio,
    label: "01 · IoT signal",
    title: "Event capture",
    copy: "ESP32-S3 and reed switches upload a compartment ID and timestamp.",
  },
  {
    icon: ShieldCheck,
    label: "02 · Not AI",
    title: "Safety Control",
    copy: "Deterministic rules classify on-time, delayed, missed, and duplicate risk.",
  },
  {
    icon: Database,
    label: "03 · Pre-dose only",
    title: "Feature builder",
    copy: "Fifteen schedule, device, and historical features rebuild the personal context.",
  },
  {
    icon: BrainCircuit,
    label: "04 · ML ensemble",
    title: "Adherence models",
    copy: "Risk, behaviour-change, and expected-delay models score the upcoming dose.",
  },
  {
    icon: Target,
    label: "05 · Guardrailed",
    title: "Intervention policy",
    copy: "Threshold, reminder budget, cooldown, timing, and opening state select the action.",
  },
  {
    icon: MessageCircle,
    label: "06 · Human-facing",
    title: "Care experience",
    copy: "The pillbox responds locally while caregivers receive concise, grounded insight.",
  },
];

const models: WalkthroughItem[] = [
  {
    icon: Target,
    label: "Classification",
    title: "Support-risk model",
    copy: "Ranks whether an upcoming dose may need additional support—not whether it is simply late.",
  },
  {
    icon: Activity,
    label: "Change detection",
    title: "Behaviour-change model",
    copy: "Compares the recent routine with the longer personal baseline to surface sustained change for review.",
  },
  {
    icon: Clock,
    label: "Regression",
    title: "Expected-delay model",
    copy: "Estimates the user’s normal opening delay for that medication context and time of day.",
  },
];

const decisionSteps = [
  {
    label: "No Action",
    detail: "A valid opening completes the dose event and cancels pending escalation.",
    tone: "neutral",
  },
  {
    label: "First Alert",
    detail: "A deterministic, scheduled local reminder. One gentle chime.",
    tone: "mint",
  },
  {
    label: "Observe",
    detail: "Allow time for the person’s natural response instead of repeating alerts immediately.",
    tone: "neutral",
  },
  {
    label: "Second Alert",
    detail: "Adaptive. Issued only when risk, daily budget, and six-hour cooldown allow it.",
    tone: "amber",
  },
  {
    label: "Caregiver Call",
    detail: "Automatic only when consent, timing, opening state, and escalation safeguards all allow it.",
    tone: "coral",
  },
];

const learningLoop = [
  ["Synthetic bootstrap", "Diverse routines prove the engineering pipeline before real users."],
  ["Shadow scoring", "Upcoming doses are scored without sending any model-driven reminder."],
  ["Outcome labelling", "Opening outcomes become provisional after the buffer and final after 24 hours."],
  ["Human review", "Targets, subgroup behaviour, alert fatigue, and calibration are reviewed."],
  ["Versioned candidate", "A candidate may enter extended Shadow evaluation—never automatic production."],
];

const benchmarkMetrics = [
  ["540K", "synthetic dose records"],
  ["2,000", "synthetic users · 90 days"],
  ["0.842", "support-risk ROC-AUC"],
  ["0.865", "behaviour-change ROC-AUC"],
  ["5.1 min", "expected-delay MAE"],
];

export default function AIExplainer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflow.current;
    };
  }, []);

  function openWalkthrough() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
  }

  function closeWalkthrough() {
    dialogRef.current?.close();
  }

  function restorePageScroll() {
    document.body.style.overflow = previousOverflow.current;
  }

  return (
    <section id="ai" className="scroll-mt-6 bg-[#fffdfa] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className={`${styles.teaser} relative overflow-hidden rounded-[34px] border border-[#ded7cc] bg-[#f7f3ec] shadow-[0_34px_75px_-56px_rgba(56,45,30,0.55)]`}>
          <div className="grid gap-10 px-6 py-8 sm:px-9 sm:py-11 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-12 lg:py-14">
            <div className="relative z-10 max-w-[600px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c9ddd6] bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#176a58]">
                <BrainCircuit aria-hidden="true" size={13} />
                Adaptive adherence intelligence
              </span>
              <h2 className="mt-5 text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-[#22201c] sm:text-5xl lg:text-[54px]">
                Quiet when the routine is normal. Decisive when it isn&apos;t.
              </h2>
              <p className="mt-5 max-w-[560px] text-base leading-7 text-[#6e675c]">
                Smart Pillbox AI learns each person&apos;s opening pattern, protects the
                safety path with transparent rules, and escalates only when the
                situation truly calls for support.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-[#514b42]">
                {[
                  "Personal baseline",
                  "Lower alert fatigue",
                  "Caregiver-ready insight",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" size={15} className="text-[#2d8b72]" />
                    {item}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={openWalkthrough}
                data-testid="open-ai-walkthrough"
                className="group mt-9 inline-flex h-13 items-center gap-3 rounded-full bg-[#173c35] px-6 text-sm font-bold text-white shadow-[0_18px_35px_-20px_rgba(23,60,53,0.8)] transition hover:-translate-y-0.5 hover:bg-[#214b43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d8b72] focus-visible:ring-offset-2"
              >
                See how our AI works
                <ArrowRight aria-hidden="true" size={17} className="transition group-hover:translate-x-1" />
              </button>
            </div>

            <div className="relative z-10 lg:pl-6">
              <div className="rounded-[26px] border border-white bg-white/82 p-4 shadow-[0_28px_60px_-42px_rgba(45,62,53,0.65)] backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between border-b border-[#ece6dd] pb-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8c857a]">
                      A personalised decision
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#28251f]">Margaret · Morning dose</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5f1] px-2.5 py-1.5 text-[9px] font-bold text-[#176a58]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2fa787]" /> Live logic
                  </span>
                </div>

                <div className="relative mt-4 space-y-2.5">
                  <div className={styles.signalRail} aria-hidden="true" />
                  {[
                    {
                      time: "08:06",
                      label: "Slot 3 opened",
                      note: "Time-stamped IoT event",
                      icon: Radio,
                    },
                    {
                      time: "+6 min",
                      label: "Within personal routine",
                      note: "Baseline for this medication time",
                      icon: BrainCircuit,
                    },
                    {
                      time: "Quiet",
                      label: "No extra alert",
                      note: "The family app stays calm",
                      icon: ShieldCheck,
                    },
                  ].map((item) => (
                    <div key={item.label} className="relative z-10 grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#ece6dd] bg-[#fffdfa] px-3 py-3.5 sm:grid-cols-[46px_minmax(0,1fr)_auto] sm:px-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6f3] text-[#1d745f]">
                        <item.icon aria-hidden="true" size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#28251f] sm:text-sm">{item.label}</p>
                        <p className="mt-0.5 text-[9px] text-[#8a8378] sm:text-[10px]">{item.note}</p>
                      </div>
                      <span className="rounded-full bg-[#f1ece4] px-2.5 py-1.5 text-[9px] font-bold text-[#5f574c] sm:text-[10px]">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#173c35] px-3.5 py-3 text-white">
                  <Sparkles aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-[#81d8c8]" />
                  <p className="text-[10px] leading-4 text-white/76 sm:text-xs sm:leading-5">
                    The same six-minute delay could be normal for Margaret and unusual
                    for someone else. That difference is the intelligence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="ai-walkthrough-title"
        aria-describedby="ai-walkthrough-description"
        onClose={restorePageScroll}
        onCancel={restorePageScroll}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeWalkthrough();
        }}
      >
        <div className={styles.dialogScroller}>
          <header className="sticky top-0 z-40 border-b border-[#e7e1d7] bg-[#fffdfa]/94 backdrop-blur-xl">
            <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173c35] text-[#81d8c8]">
                  <BrainCircuit aria-hidden="true" size={19} />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8b8378]">Smart Pillbox AI</p>
                  <p className="text-xs font-bold text-[#28251f]">AI System Walkthrough</p>
                </div>
              </div>
              <nav className="hidden items-center gap-6 text-[11px] font-bold text-[#756d62] lg:flex" aria-label="AI walkthrough sections">
                <a href="#ai-architecture" className="transition hover:text-[#173c35]">Architecture</a>
                <a href="#ai-models" className="transition hover:text-[#173c35]">Models</a>
                <a href="#ai-policy" className="transition hover:text-[#173c35]">Decision policy</a>
                <a href="#ai-learning" className="transition hover:text-[#173c35]">Learning loop</a>
              </nav>
              <button
                type="button"
                onClick={closeWalkthrough}
                aria-label="Close AI system walkthrough"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd6cb] bg-white text-[#514b42] transition hover:bg-[#f4efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d8b72]"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
          </header>

          <div className="bg-[#f6f2eb] text-[#24211d]">
            <section className={`${styles.walkthroughHero} relative overflow-hidden bg-[#173c35] px-5 py-14 text-white sm:px-8 sm:py-16 lg:px-10 lg:py-20`}>
              <div className="relative z-10 mx-auto grid w-full max-w-[1320px] gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#81d8c8]/30 bg-white/7 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-[#9be1d3]">Judge walkthrough</span>
                    <span className="rounded-full border border-[#e8b57b]/30 bg-[#5c4630]/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-[#f0c995]">Current status · Shadow only</span>
                  </div>
                  <h2 id="ai-walkthrough-title" className="mt-6 max-w-[820px] text-4xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[68px]">
                    From a lid opening to the right human response.
                  </h2>
                  <p id="ai-walkthrough-description" className="mt-6 max-w-[720px] text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
                    A hybrid AIoT system: deterministic safety control for what must
                    never fail, self-learning adherence models for personalisation,
                    and grounded language AI for caregiver understanding.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[
                    ["15", "pre-dose features"],
                    ["3", "trained models"],
                    ["1", "guardrailed policy"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.055] p-4 sm:p-5">
                      <p className="text-2xl font-bold text-[#9be1d3] sm:text-3xl">{value}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-white/48 sm:text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="ai-architecture" className="scroll-mt-20 px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto w-full max-w-[1320px]">
                <SectionHeading
                  number="01"
                  eyebrow="System architecture"
                  title="Safety first. Personalisation second. Language last."
                  copy="The architecture deliberately separates hard safety logic from probabilistic models and generated text, so every layer has a clear responsibility."
                />
                <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {architecture.map((item) => (
                    <article key={item.title} className="group rounded-2xl border border-[#ded8ce] bg-[#fffdfa] p-5 transition hover:-translate-y-0.5 hover:border-[#b9cec7] hover:shadow-[0_18px_35px_-30px_rgba(34,56,46,0.55)] sm:p-6">
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf4f0] text-[#1e745f]">
                          <item.icon aria-hidden="true" size={20} />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#978f84]">{item.label}</span>
                      </div>
                      <h3 className="mt-6 text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#746c61]">{item.copy}</p>
                    </article>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 rounded-2xl border border-[#c9dcd6] bg-[#edf6f3] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173c35] text-[#81d8c8]">
                    <CheckCircle2 aria-hidden="true" size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#175e4e]">Operational dose definition</p>
                    <p className="mt-1 text-xs leading-5 text-[#527067] sm:text-sm sm:leading-6">
                      A valid opening of the scheduled compartment is recorded as dose completion.
                      The raw <code className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] font-bold text-[#175e4e]">lid_open</code> event is retained; the system does not claim separate swallow verification.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="ai-models" className="scroll-mt-20 border-y border-[#dfd8ce] bg-[#fffdfa] px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto w-full max-w-[1320px]">
                <SectionHeading
                  number="02"
                  eyebrow="Adherence Analysis"
                  title="Three models learn what ‘normal’ means for one person."
                  copy="The target is intentionally narrower than lateness: it looks for patterns that may justify support, helping the system reduce unnecessary reminders and alert fatigue."
                />

                <div className="mt-10 grid gap-5 lg:grid-cols-[1.04fr_0.96fr]">
                  <div className="space-y-3">
                    {models.map((model) => (
                      <article key={model.title} className="grid gap-4 rounded-2xl border border-[#e2dcd2] bg-[#f8f4ed] p-5 sm:grid-cols-[48px_minmax(0,1fr)] sm:p-6">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173c35] text-[#81d8c8]">
                          <model.icon aria-hidden="true" size={21} />
                        </span>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2d806b]">{model.label}</p>
                          <h3 className="mt-1.5 text-lg font-bold">{model.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-[#70685d]">{model.copy}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="rounded-[26px] bg-[#173c35] p-6 text-white sm:p-8">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#9be1d3]">
                        <Database aria-hidden="true" size={20} />
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#81d8c8]">Feature contract</p>
                        <h3 className="mt-1 text-xl font-bold">Only information available before the dose</h3>
                      </div>
                    </div>
                    <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
                      {[
                        ["Schedule context", "Time, weekday, evening, buffer, and medication risk"],
                        ["Recent behaviour", "7-day taken rate, misses, median delay, and delay trend"],
                        ["Longer history", "28-day repeat openings and days since the last missed event"],
                        ["Device context", "Online status and event-upload delay"],
                      ].map(([label, detail]) => (
                        <div key={label} className="py-4">
                          <p className="text-xs font-bold text-white">{label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/55">{detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#9be1d3]/20 bg-white/[0.055] p-3.5">
                      <Lock aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-[#9be1d3]" />
                      <p className="text-[11px] leading-5 text-white/68">Current-dose outcomes are forbidden inputs. This prevents future information from leaking into the prediction.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="ai-policy" className="scroll-mt-20 px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto w-full max-w-[1320px]">
                <SectionHeading
                  number="03"
                  eyebrow="Intervention policy"
                  title="The model recommends. The policy decides."
                  copy="A probability never rings a phone by itself. Time, opening state, risk thresholds, reminder history, daily budget, and cooldown all gate the final action."
                />
                <div className="mt-10 overflow-hidden rounded-[28px] bg-[#173c35] p-5 text-white sm:p-8 lg:p-10">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9be1d3]">System action contract</p>
                    <span className="rounded-full border border-[#e8b57b]/30 bg-[#5c4630]/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#f0c995]">Model actions currently logged in Shadow mode</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {decisionSteps.map((step, index) => (
                      <article key={step.label} className="relative rounded-2xl border border-white/12 bg-white/[0.055] p-5">
                        <div className="flex items-center justify-between">
                          <span className={`${styles.policyDot} ${styles[step.tone]}`} />
                          <span className="text-[10px] font-bold text-white/30">0{index + 1}</span>
                        </div>
                        <h3 className="mt-7 text-lg font-bold">{step.label}</h3>
                        <p className="mt-2 text-xs leading-5 text-white/58 sm:text-sm sm:leading-6">{step.detail}</p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 rounded-2xl border border-[#e8b57b]/24 bg-[#5a432d]/28 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                    <ShieldCheck aria-hidden="true" size={24} className="text-[#f0c995]" />
                    <div>
                      <p className="text-sm font-bold text-[#f5d7ad]">Independent high-risk path</p>
                      <p className="mt-1 text-xs leading-5 text-white/62">If a high-risk medication has no opening by its caregiver-defined buffer, deterministic Safety Control can escalate even when the model is unavailable or says no.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-y border-[#dfd8ce] bg-[#fffdfa] px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto w-full max-w-[1320px]">
                <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b04a3c]">Offline engineering checkpoint</p>
                    <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">Measurable today. Honest about what it proves.</h2>
                    <p className="mt-4 text-sm leading-7 text-[#746c61]">Patient-level holdout verifies that the full training pipeline learns the synthetic world without memorising the same users across train and test.</p>
                    <div className="mt-5 rounded-xl border border-[#f0d0c9] bg-[#fff4f1] p-4">
                      <p className="text-xs font-bold text-[#9a4336]">Synthetic validation—not clinical evidence</p>
                      <p className="mt-1 text-[11px] leading-5 text-[#805d56]">These metrics prove engineering readiness for Shadow collection. Real calibration, subgroup evaluation, and alert-fatigue evidence must come from users.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {benchmarkMetrics.map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-[#e1dad0] bg-[#f8f4ed] p-4 sm:p-5">
                        <p className="text-2xl font-bold tracking-[-0.03em] text-[#173c35]">{value}</p>
                        <p className="mt-3 text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-[#837b70]">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="ai-learning" className="scroll-mt-20 px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto w-full max-w-[1320px]">
                <SectionHeading
                  number="04"
                  eyebrow="Continuous learning"
                  title="Synthetic data starts the system. Real use earns trust."
                  copy="The learning loop is designed to evolve from real opening behaviour while keeping every new candidate in Shadow mode until people review the evidence."
                />
                <div className="mt-9 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {learningLoop.map(([title, copy], index) => (
                    <article key={title} className="rounded-2xl border border-[#ded8ce] bg-[#fffdfa] p-5">
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf4f0] text-[#1f745f]">
                          {index === 0 ? <Sparkles aria-hidden="true" size={16} /> : index === 4 ? <CheckCircle2 aria-hidden="true" size={16} /> : <RefreshCw aria-hidden="true" size={15} />}
                        </span>
                        <span className="text-[10px] font-bold text-[#9a9287]">0{index + 1}</span>
                      </div>
                      <h3 className="mt-5 text-sm font-bold">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-[#756d62]">{copy}</p>
                    </article>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d7cec2] bg-[#efe9df] p-4 sm:items-center sm:px-5">
                  <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[#665e54] sm:mt-0" />
                  <p className="text-xs font-semibold leading-5 text-[#665e54]">Automatic promotion is disabled. A candidate can become eligible for more Shadow evaluation, but never activate itself in production.</p>
                </div>
              </div>
            </section>

            <section className="border-y border-[#e5d9cf] bg-[#fff7f3] px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
              <div className="mx-auto grid w-full max-w-[1320px] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe4df] text-[#b04a3c]">
                    <FileText aria-hidden="true" size={22} />
                  </span>
                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b04a3c]">AI Insights</p>
                  <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">Language AI explains the evidence. It never controls safety.</h2>
                  <p className="mt-4 text-sm leading-7 text-[#74655f]">Deterministic analytics first establish the facts—missed, delayed, duplicate, long-term versus recent. An optional DeepSeek API then turns those structured facts into clear language.</p>
                </div>
                <div className="rounded-[26px] border border-[#edcec6] bg-white p-5 shadow-[0_25px_55px_-45px_rgba(119,65,48,0.55)] sm:p-7">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      [BarChart3, "Trend report", "What changed across the recorded opening history"],
                      [MessageCircle, "Caregiver insight", "Why attention may be useful now"],
                      [FileText, "Clinic-visit note", "A concise summary ready for discussion"],
                    ].map(([Icon, title, copy]) => {
                      const TypedIcon = Icon as LucideIcon;
                      return (
                        <div key={title as string} className="rounded-2xl bg-[#fff7f3] p-4">
                          <TypedIcon aria-hidden="true" size={18} className="text-[#b04a3c]" />
                          <h3 className="mt-5 text-sm font-bold">{title as string}</h3>
                          <p className="mt-2 text-[11px] leading-5 text-[#806e67]">{copy as string}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#edd3cc] px-4 py-3">
                    <ShieldCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[#a24c3f]" />
                    <p className="text-[11px] leading-5 text-[#7d625c]">A sustained routine change can be surfaced for caregiver review. It is never labelled as memory loss, cognitive decline, or a diagnosis.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-[#fffdfa] px-5 py-12 sm:px-8 lg:px-10">
              <div className="mx-auto grid w-full max-w-[1320px] gap-5 rounded-[26px] border border-[#dcd5ca] p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2a7865]">Safety boundary</p>
                  <h2 className="mt-2 text-2xl font-bold">AI supports the care team. It does not replace it.</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-[#665f55] sm:grid-cols-4">
                  {["No prescription", "No dosage choice", "No diagnosis", "No automatic promotion"].map((item) => (
                    <span key={item} className="flex items-center gap-2 rounded-xl bg-[#f4efe7] px-3 py-3">
                      <ShieldCheck aria-hidden="true" size={14} className="shrink-0 text-[#2a806b]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
  copy,
}: {
  number: string;
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2a7e68]">{number} · {eyebrow}</p>
        <h2 className="mt-3 max-w-[690px] text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">{title}</h2>
      </div>
      <p className="max-w-[610px] text-sm leading-7 text-[#746c61] lg:justify-self-end">{copy}</p>
    </div>
  );
}
