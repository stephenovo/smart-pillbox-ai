"use client";

import {
  Activity,
  HeartPulse,
  LayoutGrid,
  MessageCircle,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import type { MainSectionTab } from "./MainSectionTabs";

type SidebarProps = {
  activeTab: MainSectionTab;
  onTabChange: (tab: MainSectionTab) => void;
};

const navigation: {
  id: MainSectionTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "dashboard", label: "Care feed", icon: LayoutGrid },
  { id: "initialisation", label: "Medication plan", icon: Pill },
  { id: "pillbox", label: "Device activity", icon: Activity },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white px-5 py-7 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-white">
          <HeartPulse aria-hidden="true" size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-950">careloop</h1>
          <p className="text-xs text-neutral-500">Medication care</p>
        </div>
      </div>

      <nav aria-label="Primary" className="mt-10 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-stone-100 hover:text-neutral-950"
              }`}
            >
              <Icon aria-hidden="true" size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <p className="px-3 text-xs font-semibold uppercase text-neutral-400">
          Your circle
        </p>
        <a
          href="/mobile"
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-stone-100 hover:text-neutral-950"
        >
          <Users aria-hidden="true" size={19} />
          Family mobile view
        </a>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-stone-100 hover:text-neutral-950"
        >
          <MessageCircle aria-hidden="true" size={19} />
          Care messages
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-stone-100 hover:text-neutral-950"
        >
          <Settings aria-hidden="true" size={19} />
          Settings
        </button>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-stone-200 px-2 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff4ef] text-sm font-bold text-teal-800">
          SC
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">
            Sarah Chen
          </p>
          <p className="truncate text-xs text-neutral-500">Family caregiver</p>
        </div>
        <span
          className="h-2.5 w-2.5 rounded-full bg-teal-500"
          title="Online"
        />
      </div>
    </aside>
  );
}
