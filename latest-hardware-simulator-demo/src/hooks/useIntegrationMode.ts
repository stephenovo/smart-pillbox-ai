"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  IntegrationMode,
  IntegrationModeApiResponse,
} from "../types/hardware";

const modeChangedEvent = "smart-pillbox-integration-mode-changed";

export function useIntegrationMode() {
  const [integration, setIntegration] =
    useState<IntegrationModeApiResponse | null>(null);
  const [isChangingMode, setIsChangingMode] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/integration/mode", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Integration mode is unavailable.");
    }

    const data = (await response.json()) as IntegrationModeApiResponse;
    setIntegration(data);
    return data;
  }, []);

  useEffect(() => {
    let isActive = true;

    async function sync() {
      try {
        const response = await fetch("/api/integration/mode", {
          cache: "no-store",
        });
        if (!response.ok || !isActive) return;
        setIntegration((await response.json()) as IntegrationModeApiResponse);
      } catch {
        // Standalone remains the safe fallback when the local API is unavailable.
      }
    }

    function handleModeChanged(event: Event) {
      const detail = (event as CustomEvent<IntegrationModeApiResponse>).detail;
      if (detail) setIntegration(detail);
    }

    sync();
    const intervalId = window.setInterval(sync, 2500);
    window.addEventListener(modeChangedEvent, handleModeChanged);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener(modeChangedEvent, handleModeChanged);
    };
  }, []);

  const setMode = useCallback(async (mode: IntegrationMode) => {
    setIsChangingMode(true);
    try {
      const response = await fetch("/api/integration/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        throw new Error("Connection mode could not be changed.");
      }

      const data = (await response.json()) as IntegrationModeApiResponse;
      setIntegration(data);
      window.dispatchEvent(new CustomEvent(modeChangedEvent, { detail: data }));
      return data;
    } finally {
      setIsChangingMode(false);
    }
  }, []);

  return {
    integration,
    mode: integration?.mode ?? "standalone",
    activeDeviceId: integration?.activeDeviceId ?? null,
    activeSource: integration?.activeSource ?? null,
    isLoading: integration === null,
    isChangingMode,
    refresh,
    setMode,
  };
}
