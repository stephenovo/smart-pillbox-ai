"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { InitialisationTable } from "./InitialisationTable";

type InitialisationSetupPanelProps = ComponentProps<
  typeof InitialisationTable
>;

const onboardingSteps = [
  {
    title: "Assign each compartment",
    description:
      "Enter the medication routine linked to each pillbox compartment.",
  },
  {
    title: "Set reminder time",
    description:
      "Choose when the pillbox should activate local reminders for the patient.",
  },
  {
    title: "Confirm safety settings",
    description:
      "Mark high-risk medication and set the caregiver-defined buffer time.",
  },
];

export default function InitialisationSetupPanel(
  props: InitialisationSetupPanelProps
) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const configuredMedicationCount = props.schedule.filter(
    (item) => item.medication.trim() !== ""
  ).length;

  useEffect(() => {
    const hasSeenTutorial =
      window.localStorage.getItem("smart-pillbox-initialisation-tutorial") ===
      "seen";

    if (!hasSeenTutorial) {
      setShowOnboarding(true);
    }
  }, []);

  function closeTutorial() {
    window.localStorage.setItem(
      "smart-pillbox-initialisation-tutorial",
      "seen"
    );

    setShowOnboarding(false);
    setCurrentStepIndex(0);
  }

  function openTutorial() {
    setCurrentStepIndex(0);
    setShowOnboarding(true);
  }

  const currentStep = onboardingSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === onboardingSteps.length - 1;

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Quick Start
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Set up Smart Pillbox AI
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeTutorial}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm hover:text-slate-900"
                >
                  Skip Tutorial
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  {onboardingSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className={`h-2 flex-1 rounded-full ${
                        index <= currentStepIndex
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-emerald-600">
                    Step {currentStepIndex + 1} of {onboardingSteps.length}
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-slate-950">
                    {currentStep.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentStepIndex((current) => Math.max(0, current - 1))
                  }
                  disabled={isFirstStep}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isLastStep) {
                      closeTutorial();
                      return;
                    }

                    setCurrentStepIndex((current) => current + 1);
                  }}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  {isLastStep ? "Start Setup" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Initialisation
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Patient Medication Setup
              </h2>
            </div>

            <button
              type="button"
              onClick={openTutorial}
              className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              View Tutorial
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Configured Medications
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {configuredMedicationCount}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                out of {props.schedule.length} compartments
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Medication Plan
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Compartment Schedule
            </h3>
          </div>

          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            SmartPillbox: 8-compartment
          </div>
        </div>

        <InitialisationTable {...props} />
      </section>
    </div>
  );
}