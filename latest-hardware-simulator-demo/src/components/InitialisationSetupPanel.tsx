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
      window.setTimeout(() => setShowOnboarding(true), 0);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#e34747]">
                    Quick Start
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-neutral-950">
                    Set up Margaret&apos;s pillbox
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeTutorial}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-500 hover:bg-stone-100 hover:text-neutral-950"
                >
                  Skip Tutorial
                </button>
              </div>

              <div className="mt-6 rounded-lg border border-stone-200 bg-[#fafafa] p-6">
                <div className="flex items-center gap-2">
                  {onboardingSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className={`h-2 flex-1 rounded-full ${
                        index <= currentStepIndex
                          ? "bg-[#ff5c5c]"
                          : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#e34747]">
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
                  className="rounded-md border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  {isLastStep ? "Start Setup" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase text-[#e34747]">
                Medication plan
              </p>

              <h2 className="mt-1 text-2xl font-bold text-neutral-950 sm:text-3xl">
                Margaret&apos;s daily routine
              </h2>
            </div>

            <button
              type="button"
              onClick={openTutorial}
              className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-stone-50"
            >
              View Tutorial
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="border-l-2 border-[#ff5c5c] pl-4">
              <p className="text-sm font-medium text-slate-500">
                Active medications
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

      <section className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-400">
              Pillbox layout
            </p>

            <h3 className="mt-1 text-xl font-bold text-neutral-950">
              Compartment schedule
            </h3>
          </div>

          <div className="rounded-full bg-[#effaf7] px-3 py-1.5 text-xs font-bold text-teal-700">
            8-compartment device
          </div>
        </div>

        <InitialisationTable {...props} />
      </section>
    </div>
  );
}
