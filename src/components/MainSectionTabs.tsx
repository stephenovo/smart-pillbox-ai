"use client";

import { Activity, LayoutGrid, Pill } from "lucide-react";

export type MainSectionTab = "initialisation" | "pillbox" | "dashboard";

type MainSectionTabsProps = {
  activeTab: MainSectionTab;
  onTabChange: (tab: MainSectionTab) => void;
};

const tabs: {
  id: MainSectionTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  {
    id: "dashboard",
    label: "Care feed",
    icon: LayoutGrid,
  },
  {
    id: "initialisation",
    label: "Meds",
    icon: Pill,
  },
  {
    id: "pillbox",
    label: "Activity",
    icon: Activity,
  },
];

export default function MainSectionTabs({
  activeTab,
  onTabChange,
}: MainSectionTabsProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                isActive ? "text-neutral-950" : "text-neutral-400"
              }`}
            >
              <Icon
                aria-hidden="true"
                size={21}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
