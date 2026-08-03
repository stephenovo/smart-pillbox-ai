"use client";

import {
  Activity,
  LayoutGrid,
  MessageCircle,
  Pill,
  Settings,
} from "lucide-react";

export type MainSectionTab =
  | "dashboard"
  | "initialisation"
  | "pillbox"
  | "messages"
  | "settings";

type MainSectionTabsProps = {
  activeTab: MainSectionTab;
  onTabChange: (tab: MainSectionTab) => void;
};

const tabs: {
  id: MainSectionTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "dashboard", label: "Care feed", icon: LayoutGrid },
  { id: "initialisation", label: "Meds", icon: Pill },
  { id: "pillbox", label: "Activity", icon: Activity },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function MainSectionTabs({
  activeTab,
  onTabChange,
}: MainSectionTabsProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                isActive ? "text-ink" : "text-ink-faint"
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
