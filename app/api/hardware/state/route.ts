import { NextResponse } from "next/server";

import {
  getHardwareDeviceState,
  setHardwareDeviceState,
} from "../../../../src/lib/hardwareEventStore";
import {
  DEMO_DEVICE_ID,
  validateHardwareStateMutation,
} from "../../../../src/lib/hardwareProtocol";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
  const isDeviceHeartbeat = searchParams.get("heartbeat") === "1";
  const state = getHardwareDeviceState(deviceId, {
    markSeen: isDeviceHeartbeat,
    evaluateSchedule: isDeviceHeartbeat,
  });

  return jsonResponse(state);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = validateHardwareStateMutation(body);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  const state = setHardwareDeviceState(
    result.payload.deviceId,
    result.payload.status,
    result.payload.activeSlot ?? null
  );
  return jsonResponse(state);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
