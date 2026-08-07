import type { InterventionExecutionMode } from "../types/intervention";

export type CaregiverCallRequest = {
  to: string;
  medication: string;
  compartmentId: number;
  scheduledAt: string;
  highRisk: boolean;
  idempotencyKey: string;
};

export type CaregiverCallResult = {
  status: "shadowed" | "simulated" | "executed" | "failed";
  provider: "simulation" | "twilio" | null;
  externalCallId: string | null;
  error: string | null;
};

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function callMessage(request: CaregiverCallRequest): string {
  const riskText = request.highRisk ? " This is a high risk medication." : "";
  return [
    "This is Smart Pillbox AI.",
    `No opening was detected for compartment ${request.compartmentId}, scheduled at ${new Date(
      request.scheduledAt
    ).toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" })}.`,
    riskText,
    "Please check in with the person you support.",
  ]
    .filter(Boolean)
    .join(" ");
}

function hasLiveCallPermission(): boolean {
  return (
    process.env.CAREGIVER_CALL_EXECUTION_ENABLED === "true" &&
    process.env.CAREGIVER_CALL_PROVIDER === "twilio" &&
    process.env.CAREGIVER_CALL_CONSENT_CONFIRMED === "true"
  );
}

async function placeTwilioCall(
  request: CaregiverCallRequest
): Promise<CaregiverCallResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    return {
      status: "failed",
      provider: "twilio",
      externalCallId: null,
      error:
        "Live caregiver calling requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
    };
  }

  const twiml = `<Response><Say>${xmlEscape(callMessage(request))}</Say></Response>`;
  const body = new URLSearchParams({
    To: request.to,
    From: from,
    Twiml: twiml,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      accountSid
    )}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString(
          "base64"
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": request.idempotencyKey,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }
  );
  const payload = (await response.json().catch(() => null)) as
    | { sid?: string; message?: string }
    | null;
  if (!response.ok || !payload?.sid) {
    return {
      status: "failed",
      provider: "twilio",
      externalCallId: null,
      error: payload?.message ?? `Twilio returned HTTP ${response.status}.`,
    };
  }

  return {
    status: "executed",
    provider: "twilio",
    externalCallId: payload.sid,
    error: null,
  };
}

export async function placeCaregiverCall(
  request: CaregiverCallRequest,
  mode: InterventionExecutionMode
): Promise<CaregiverCallResult> {
  if (mode === "shadow") {
    return {
      status: "shadowed",
      provider: null,
      externalCallId: null,
      error: null,
    };
  }

  if (mode === "demo") {
    return {
      status: "simulated",
      provider: "simulation",
      externalCallId: `simulated-${request.idempotencyKey}`,
      error: null,
    };
  }

  if (!hasLiveCallPermission()) {
    return {
      status: "failed",
      provider: null,
      externalCallId: null,
      error:
        "Live caregiver calling is locked. Set CAREGIVER_CALL_PROVIDER=twilio, CAREGIVER_CALL_EXECUTION_ENABLED=true, and CAREGIVER_CALL_CONSENT_CONFIRMED=true after consent and number verification.",
    };
  }

  return placeTwilioCall(request);
}
