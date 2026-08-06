import { NextResponse } from "next/server";

import {
  getIntegrationMode,
  setIntegrationMode,
} from "../../../../src/lib/hardwareEventStore";
import {
  getIntegrationTarget,
  isIntegrationMode,
} from "../../../../src/lib/integrationMode";
import type {
  IntegrationMode,
  IntegrationModeApiResponse,
} from "../../../../src/types/hardware";

export const dynamic = "force-dynamic";

function buildResponse(
  mode: IntegrationMode,
  updatedAt: string
): IntegrationModeApiResponse {
  const target = getIntegrationTarget(mode);
  return {
    mode,
    connected: mode !== "standalone",
    activeDeviceId: target.deviceId,
    activeSource: target.source,
    updatedAt,
    serverTime: new Date().toISOString(),
  };
}

export async function GET() {
  const current = getIntegrationMode();
  return NextResponse.json(buildResponse(current.mode, current.updatedAt));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const mode =
    body && typeof body === "object" && "mode" in body
      ? (body as { mode?: unknown }).mode
      : undefined;

  if (!isIntegrationMode(mode)) {
    return NextResponse.json(
      { error: "mode must be standalone, simulator, or hardware." },
      { status: 400 }
    );
  }

  const next = setIntegrationMode(mode);
  return NextResponse.json(buildResponse(next.mode, next.updatedAt));
}
