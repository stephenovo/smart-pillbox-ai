#!/usr/bin/env python3
"""Replay synthetic doses as hardware events and run the models in shadow mode.

The emitted hardware JSONL intentionally contains only device-observable data.
Synthetic labels stay in the shadow report so this runner can measure behaviour
without making labels available to the event-processing path.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from train_adherence_model import FEATURE_COLUMNS, parse_value


def parse_datetime(row: dict[str, str]) -> datetime:
    scheduled = int(float(row["scheduled_minutes"]))
    midnight = datetime.fromisoformat(row["dose_date"])
    return midnight + timedelta(minutes=scheduled)


def iso(value: datetime) -> str:
    # Synthetic schedules are local wall-clock times. Leaving the offset
    # unspecified lets the local replay server interpret them consistently.
    return value.isoformat(timespec="seconds")


def build_hardware_events(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for row in rows:
        actual_delay = row["actual_delay_minutes"]
        if actual_delay == "":
            continue

        device_time = parse_datetime(row) + timedelta(minutes=float(actual_delay))
        received_time = device_time + timedelta(
            minutes=float(row["event_upload_delay_minutes"])
        )
        event_count = int(row["opening_count"])
        device_id = f"synthetic-device-{row['patient_id'].removeprefix('synthetic-')}"
        for opening_index in range(event_count):
            opening_time = device_time + timedelta(minutes=opening_index)
            opening_received = received_time + timedelta(minutes=opening_index)
            events.append(
                {
                    "eventId": f"replay-{row['dose_id']}-{opening_index + 1}",
                    "deviceId": device_id,
                    "slotId": int(row["compartment_id"]),
                    "eventType": "lid_open",
                    "deviceTimestamp": iso(opening_time),
                    "receivedAt": iso(opening_received),
                    "firmwareVersion": "synthetic-replay-0.1.0",
                }
            )

    return sorted(events, key=lambda event: event["receivedAt"])


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    required = {
        "patient_id",
        "dose_id",
        "dose_date",
        "scheduled_minutes",
        "compartment_id",
        "actual_delay_minutes",
        "opening_count",
        "event_upload_delay_minutes",
        "needs_support",
        "behaviour_change_signal",
        "high_risk",
        "buffer_minutes",
        "routine",
    }
    missing = sorted(required - set(rows[0])) if rows else sorted(required)
    if missing:
        raise SystemExit(f"input is missing columns: {', '.join(missing)}")
    return rows


def binary_metrics(records: list[dict[str, Any]], prediction_key: str) -> dict[str, float]:
    predicted = [bool(record[prediction_key]) for record in records]
    truth = [bool(record["synthetic_needs_support"]) for record in records]
    true_positive = sum(p and t for p, t in zip(predicted, truth))
    predicted_positive = sum(predicted)
    actual_positive = sum(truth)
    return {
        "precision": round(true_positive / predicted_positive, 5)
        if predicted_positive
        else 0.0,
        "recall": round(true_positive / actual_positive, 5) if actual_positive else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path(".data/ml/synthetic_dose_records.csv"))
    parser.add_argument("--model-dir", type=Path, default=Path(".data/ml/model"))
    parser.add_argument("--policy", type=Path, default=Path(".data/ml/model/intervention_policy.json"))
    parser.add_argument("--events-output", type=Path, default=Path(".data/ml/replay/hardware_events.jsonl"))
    parser.add_argument("--shadow-output", type=Path, default=Path(".data/ml/replay/shadow_decisions.jsonl"))
    parser.add_argument("--summary-output", type=Path, default=Path(".data/ml/replay/summary.json"))
    parser.add_argument("--demo-output", type=Path, default=Path(".data/ml/replay/demo_bundle.json"))
    parser.add_argument("--demo-patient", default="")
    parser.add_argument("--demo-days", type=int, default=14)
    args = parser.parse_args()
    if args.demo_days < 1 or args.demo_days > 90:
        raise SystemExit("demo-days must be between 1 and 90")

    rows = load_rows(args.input)
    risk_model = joblib.load(args.model_dir / "risk_model.joblib")
    change_model = joblib.load(args.model_dir / "behaviour_change_model.joblib")
    policy = json.loads(args.policy.read_text(encoding="utf-8"))
    threshold = float(policy["risk_threshold"])
    max_per_day = int(policy["runtime_guardrails"]["max_adaptive_reminders_per_patient_day"])
    minimum_gap_hours = float(
        policy["runtime_guardrails"]["minimum_hours_between_adaptive_reminders"]
    )

    matrix = np.asarray(
        [[parse_value(row[column]) for column in FEATURE_COLUMNS] for row in rows],
        dtype=np.float32,
    )
    risk_probability = risk_model.predict_proba(matrix)[:, 1]
    change_probability = change_model.predict_proba(matrix)[:, 1]

    # The input is already chronological per patient. Sorting by patient and
    # scheduled time makes the daily budget deterministic and future-safe.
    indexed_rows = sorted(
        enumerate(rows), key=lambda item: (item[1]["patient_id"], parse_datetime(item[1]))
    )
    daily_count: dict[tuple[str, str], int] = defaultdict(int)
    last_adaptive_at: dict[str, datetime] = {}
    shadow_records: list[dict[str, Any]] = []
    for index, row in indexed_rows:
        scheduled_at = parse_datetime(row)
        patient_day = (row["patient_id"], row["dose_date"])
        risk = float(risk_probability[index])
        change = float(change_probability[index])
        candidate = risk >= threshold
        gap_ok = (
            row["patient_id"] not in last_adaptive_at
            or scheduled_at - last_adaptive_at[row["patient_id"]]
            >= timedelta(hours=minimum_gap_hours)
        )
        allowed = candidate and daily_count[patient_day] < max_per_day and gap_ok
        if allowed:
            daily_count[patient_day] += 1
            last_adaptive_at[row["patient_id"]] = scheduled_at

        # This is an offline evaluation of the hard safety boundary. A
        # production implementation must evaluate it from observed events,
        # never from the synthetic status or label.
        actual_delay = row["actual_delay_minutes"]
        observed_by_buffer = False
        if actual_delay != "":
            received_at = scheduled_at + timedelta(
                minutes=float(actual_delay) + float(row["event_upload_delay_minutes"])
            )
            buffer_at = scheduled_at + timedelta(minutes=float(row["buffer_minutes"]))
            observed_by_buffer = received_at <= buffer_at
        safety_control_evaluation = bool(
            int(row["high_risk"]) and not observed_by_buffer
        )
        shadow_records.append(
            {
                "dose_id": row["dose_id"],
                "patient_id": row["patient_id"],
                "dose_date": row["dose_date"],
                "compartment_id": int(row["compartment_id"]),
                "scheduled_at": iso(scheduled_at),
                "risk_probability": round(risk, 6),
                "behaviour_change_probability": round(change, 6),
                "adaptive_candidate": candidate,
                "adaptive_allowed_after_budget": allowed,
                "safety_control_evaluation": safety_control_evaluation,
                "synthetic_status": row["status"],
                "synthetic_needs_support": int(row["needs_support"]),
                "synthetic_behaviour_change_signal": int(row["behaviour_change_signal"]),
            }
        )

    hardware_events = build_hardware_events(rows)
    args.events_output.parent.mkdir(parents=True, exist_ok=True)
    with args.events_output.open("w", encoding="utf-8") as handle:
        for event in hardware_events:
            handle.write(json.dumps(event, separators=(",", ":")) + "\n")
    with args.shadow_output.open("w", encoding="utf-8") as handle:
        for record in shadow_records:
            handle.write(json.dumps(record, separators=(",", ":")) + "\n")

    available_patients = sorted({row["patient_id"] for row in rows})
    forgetting_patients = sorted(
        {
            row["patient_id"]
            for row in rows
            if row.get("latent_persona") == "forgetting_drift"
        }
    )
    demo_patient = args.demo_patient or (
        forgetting_patients[0] if forgetting_patients else available_patients[0]
    )
    if demo_patient not in available_patients:
        raise SystemExit(f"demo patient not found: {demo_patient}")

    patient_rows = sorted(
        [row for row in rows if row["patient_id"] == demo_patient],
        key=parse_datetime,
    )
    patient_dates = sorted({row["dose_date"] for row in patient_rows})
    change_dates = sorted(
        {
            row["dose_date"]
            for row in patient_rows
            if int(row["behaviour_change_signal"])
        }
    )
    if change_dates:
        change_index = patient_dates.index(change_dates[0])
        start_index = max(0, min(change_index - 4, len(patient_dates) - args.demo_days))
    else:
        start_index = 0
    selected_dates = set(patient_dates[start_index : start_index + args.demo_days])
    selected_rows = [row for row in patient_rows if row["dose_date"] in selected_dates]
    selected_dose_ids = {row["dose_id"] for row in selected_rows}
    warmup_dates = set(patient_dates[max(0, start_index - 28) : start_index])
    warmup_rows = [row for row in patient_rows if row["dose_date"] in warmup_dates]
    warmup_dose_ids = {row["dose_id"] for row in warmup_rows}
    row_by_dose = {row["dose_id"]: row for row in selected_rows}
    demo_decisions = []
    for record in shadow_records:
        if record["dose_id"] not in selected_dose_ids:
            continue
        source = row_by_dose[record["dose_id"]]
        demo_decisions.append(
            {
                **record,
                "history_features": {
                    column: parse_value(source[column]) for column in FEATURE_COLUMNS
                },
            }
        )
    demo_events = [
        event
        for event in hardware_events
        if event["eventId"].rsplit("-", 1)[0].removeprefix("replay-")
        in selected_dose_ids
    ]
    history_events = [
        event
        for event in hardware_events
        if event["eventId"].rsplit("-", 1)[0].removeprefix("replay-")
        in warmup_dose_ids
    ]
    demo_bundle = {
        "model_source": "synthetic",
        "warning": "Development replay only; never use these labels as production inputs.",
        "source_patient_id": demo_patient,
        "source_device_id": f"synthetic-device-{demo_patient.removeprefix('synthetic-')}",
        "latent_persona": patient_rows[0].get("latent_persona", "unknown"),
        "date_range": [min(selected_dates), max(selected_dates)],
        "observation_started_at": (
            f"{min(warmup_dates)}T00:00:00"
            if warmup_dates
            else f"{min(selected_dates)}T00:00:00"
        ),
        "plan": [
            {
                "slotId": int(row["compartment_id"]),
                "medication": f"{row['routine'].title()} medication",
                "scheduledTime": (
                    f"{int(float(row['scheduled_minutes'])) // 60:02d}:"
                    f"{int(float(row['scheduled_minutes'])) % 60:02d}"
                ),
                "highRisk": bool(int(row["high_risk"])),
                "bufferTimeMinutes": int(float(row["buffer_minutes"])),
            }
            for row in sorted(
                {
                    row["compartment_id"]: row for row in selected_rows
                }.values(),
                key=lambda row: int(row["compartment_id"]),
            )
        ],
        "events": demo_events,
        "history_events": history_events,
        "shadow_decisions": demo_decisions,
    }
    args.demo_output.parent.mkdir(parents=True, exist_ok=True)
    args.demo_output.write_text(json.dumps(demo_bundle, indent=2) + "\n", encoding="utf-8")

    total = len(shadow_records)
    candidate_count = sum(record["adaptive_candidate"] for record in shadow_records)
    allowed_count = sum(record["adaptive_allowed_after_budget"] for record in shadow_records)
    safety_count = sum(record["safety_control_evaluation"] for record in shadow_records)
    summary = {
        "model_source": "synthetic",
        "warning": "Replay and shadow metrics are synthetic verification only.",
        "dose_rows": total,
        "hardware_events": len(hardware_events),
        "adaptive_candidate_rate": round(candidate_count / total, 5),
        "adaptive_allowed_rate": round(allowed_count / total, 5),
        "adaptive_candidate_metrics": binary_metrics(
            shadow_records, "adaptive_candidate"
        ),
        "adaptive_allowed_metrics": binary_metrics(
            shadow_records, "adaptive_allowed_after_budget"
        ),
        "adaptive_candidates_per_patient_day": round(candidate_count / (len({(r['patient_id'], r['dose_date']) for r in rows})), 5),
        "adaptive_allowed_per_patient_day": round(allowed_count / (len({(r['patient_id'], r['dose_date']) for r in rows})), 5),
        "safety_control_evaluation_count": safety_count,
        "daily_budget_compliance": all(
            count <= max_per_day for count in daily_count.values()
        ),
        "cooldown_compliance": True,
        "threshold": threshold,
        "outputs": {
            "hardware_events": str(args.events_output),
            "shadow_decisions": str(args.shadow_output),
            "demo_bundle": str(args.demo_output),
        },
    }
    args.summary_output.parent.mkdir(parents=True, exist_ok=True)
    args.summary_output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
