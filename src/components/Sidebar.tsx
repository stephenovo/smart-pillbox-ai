"use client";

import Image from "next/image";
import {
  Activity,
  LayoutGrid,
  MessageCircle,
  Pill,
  Settings,
  Smartphone,
  Wrench,
} from "lucide-react";
import { profileInitials } from "../lib/userProfile";
import { type AppMode } from "../lib/appMode";
import type { UserProfile } from "../types/profile";
import type { MainSectionTab } from "./MainSectionTabs";

type SidebarProps = {
  activeTab: MainSectionTab;
  onTabChange: (tab: MainSectionTab) => void;
  profile: UserProfile;
  mode: AppMode;
};

const navigation: {
  id: MainSectionTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "dashboard", label: "Care feed", icon: LayoutGrid },
  { id: "initialisation", label: "Medication plan", icon: Pill },
  { id: "pillbox", label: "Device activity", icon: Activity },
  { id: "messages", label: "Care messages", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, profile, mode }: SidebarProps) {
  const isMyCare = mode === "my-care";
  const visibleNavigation = isMyCare
    ? navigation.filter((item) => item.id !== "messages").map((item) => ({
        ...item,
        label:
          item.id === "dashboard"
            ? "Today"
            : item.id === "initialisation"
              ? "My medicines"
              : item.id === "pillbox"
                ? "My pillbox"
                : item.label,
      }))
    : navigation;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-5 py-7 lg:flex">
      <div className="flex items-center px-2">
        <Image
          src="/brand-icon.png"
          alt=""
          aria-hidden="true"
          width={44}
          height={44}
          className="h-11 w-11"
          priority
        />
      </div>

      <nav aria-label="Primary" className="mt-10 space-y-1.5">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-action text-on-action"
                  : "text-ink-soft hover:bg-cream-deep hover:text-ink"
              }`}
            >
              <Icon aria-hidden="true" size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-line pt-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {isMyCare ? "Your support" : "On the go"}
        </p>
        <a
          href="/mobile"
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-deep hover:text-ink"
        >
          <Smartphone aria-hidden="true" size={19} />
          {isMyCare ? "Share with family" : "Family mobile view"}
        </a>
        <a
          href="/studio"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-deep hover:text-ink"
        >
          <Wrench aria-hidden="true" size={19} />
          Device Studio
        </a>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-line px-2 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-soft text-sm font-bold text-mint-ink">
          {profileInitials(profile)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {profile.fullName}
          </p>
          <p className="truncate text-xs text-ink-soft">{profile.role}</p>
        </div>
        <span
          className="h-2.5 w-2.5 rounded-full bg-mint"
          title="Online"
        />
      </div>
    </aside>
  );
}
