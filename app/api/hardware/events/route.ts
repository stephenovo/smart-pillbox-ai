import { NextResponse } from "next/server";

import {
  addHardwareOpeningEvent,
  clearHardwareOpeningEvents,
  getHardwareOpeningEvents,
} from "../../../../src/lib/hardwareEventStore";
import {
  DEMO_DEVICE_ID,
  validateHardwareEventPayload,
} from "../../../../src/lib/hardwareProtocol";
import type { HardwareEventsApiResponse } from "../../../../src/types/hardware";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Device-Key",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId")?.trim() || DEMO_DEVICE_ID;
  const requestedLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
    : 50;
  const events = getHardwareOpeningEvents(deviceId).slice(0, limit);
  const response: HardwareEventsApiResponse = {
    deviceId,
    events,
    count: events.length,
    serverTime: new Date().toISOString(),
  };

  return jsonResponse(response);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = validateHardwareEventPayload(body);

  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  const { event, duplicate } = addHardwareOpeningEvent(result.payload);

  return jsonResponse({
    accepted: true,
    recorded: event !== null,
    duplicate,
    event,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId")?.trim() || DEMO_DEVICE_ID;
  clearHardwareOpeningEvents(deviceId);
  return jsonResponse({ cleared: true });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
