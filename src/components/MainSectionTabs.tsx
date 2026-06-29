"use client";

export type MainSectionTab = "initialisation" | "pillbox" | "dashboard";

type MainSectionTabsProps = {
  activeTab: MainSectionTab;
  onTabChange: (tab: MainSectionTab) => void;
};

const tabs: {
  id: MainSectionTab;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "initialisation",
    label: "Initialisation",
    subtitle: "Set medication schedule and safety limits",
  },
  {
    id: "pillbox",
    label: "Pillbox",
    subtitle: "Run hardware demo and opening simulation",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Review adherence status and AI insights",
  },
];

export default function MainSectionTabs({
  activeTab,
  onTabChange,
}: MainSectionTabsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-xl px-4 py-4 text-left transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <p className="text-sm font-bold">{tab.label}</p>
              <p
                className={`mt-1 text-xs leading-5 ${
                  isActive ? "text-emerald-50" : "text-slate-500"
                }`}
              >
                {tab.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}