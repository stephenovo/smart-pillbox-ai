# Adherence Intervention Decision Engine

## Product assumption

A valid `lid_open` event for the scheduled compartment is treated as dose
completion. The raw opening event remains stored so the operational definition
is explicit and auditable.

## Decision layers

The trained model does not place calls or control the safety path directly.
Responsibility is separated into three layers:

1. The adherence model produces risk and behaviour-change probabilities.
2. The intervention policy combines those probabilities with time, reminder
   history, the daily budget, cooldown, and the opening state.
3. Deterministic Safety Control can escalate a high-risk medication even when
   the model is unavailable or does not approve adaptive support.

The action vocabulary is:

- `no_action`
- `first_alert`
- `second_alert`
- `caregiver_call`
- `high_risk_escalation`
- `dose_completed`

`First Alert` is the deterministic scheduled local reminder. `Second Alert` is
adaptive and requires the trained risk decision to pass the reminder budget.
The ESP32 state contract carries `reminderStage`: the first alert uses one
gentle chime per cycle, while the second alert uses a two-chime pattern and a
distinct OLED message.
For a normal-risk medication, a caregiver call is recommended after the buffer
only when adaptive support was approved and no valid opening was recorded. For
a high-risk medication, no opening by the caregiver-defined buffer takes the
independent high-risk escalation path.

Every non-empty action has an idempotency key derived from the dose and action,
so repeated heartbeats cannot issue the same alert or call twice. A valid
opening creates `dose_completed` and prevents later actions for the dose.

## Execution modes

Set `ADHERENCE_INTERVENTION_MODE` to one of:

- `shadow`: record decisions without controlling hardware or calling anyone.
- `demo`: execute local reminders and simulate caregiver calls. This is the
  default in local development.
- `live`: execute local reminders; real calls remain separately locked.

Real calls require all of the following local environment variables:

```text
ADHERENCE_INTERVENTION_MODE=live
CAREGIVER_CALL_PROVIDER=twilio
CAREGIVER_CALL_EXECUTION_ENABLED=true
CAREGIVER_CALL_CONSENT_CONFIRMED=true
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```

The destination is the caregiver phone number saved in the profile. Secrets
must remain in local environment configuration and must never be committed.
Consent, number verification, quiet hours, audit retention, and a production
incident process are required before enabling live calls.

## Development inspection

Hardware heartbeats and accepted opening events invoke the normal adherence
lifecycle. Inspect the resulting actions with:

```http
GET /api/adherence/interventions?patientId=PILLBOX-DEMO-001
```

Clear development decisions with:

```http
DELETE /api/adherence/interventions?patientId=PILLBOX-DEMO-001
```

Manual time advancement continues to use `POST /api/adherence/lifecycle`.
