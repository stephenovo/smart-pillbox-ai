"use client";

import { HeartHandshake, UserRound, UsersRound } from "lucide-react";
import { appModeDetails, type AppMode } from "../lib/appMode";

type AppModeSwitcherProps = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
  compact?: boolean;
};

export default function AppModeSwitcher({
  mode,
  onChange,
  compact = false,
}: AppModeSwitcherProps) {
  const options: { id: AppMode; icon: typeof UsersRound }[] = [
    { id: "circle-care", icon: UsersRound },
    { id: "my-care", icon: UserRound },
  ];

  return (
    <div
      aria-label="View mode"
      className={`inline-flex items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-card ${
        compact ? "max-w-full" : "w-full"
      }`}
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-label={appModeDetails[option.id].label}
            aria-pressed={isSelected}
            onClick={() => onChange(option.id)}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition sm:text-sm ${
              isSelected
                ? "bg-action text-on-action shadow-card"
                : "text-ink-soft hover:bg-cream-deep hover:text-ink"
            } ${compact ? "sm:px-3.5" : "flex-1"}`}
          >
            <Icon aria-hidden="true" size={compact ? 15 : 17} />
            <span className={compact ? "hidden sm:inline" : ""}>
              {appModeDetails[option.id].label}
            </span>
            {option.id === "my-care" && !compact && (
              <HeartHandshake aria-hidden="true" className="hidden text-coral sm:block" size={14} />
            )}
          </button>
        );
      })}
    </div>
  );
}
