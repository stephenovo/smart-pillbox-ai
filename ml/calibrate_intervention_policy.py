#!/usr/bin/env python3
"""Calibrate a conservative adaptive-reminder operating point on holdout data.

This produces a policy checkpoint only. It is not a clinical threshold and must
be recalibrated after real hardware events are collected.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import average_precision_score, precision_score, recall_score

from train_adherence_model import FEATURE_COLUMNS, load_rows, parse_value


def scheduled_datetime(row: dict[str, str]) -> datetime:
    return datetime.fromisoformat(row["dose_date"]) + timedelta(
        minutes=float(row["scheduled_minutes"])
    )


def apply_runtime_budget(
    rows: list[dict[str, str]],
    probability: np.ndarray,
    threshold: float,
    max_per_day: int = 1,
    minimum_gap_hours: float = 6.0,
) -> np.ndarray:
    """Apply the same chronological budget used by the shadow runner."""
    selected = np.zeros(len(rows), dtype=bool)
    daily_count: dict[tuple[str, str], int] = defaultdict(int)
    last_adaptive_at: dict[str, datetime] = {}
    ordered = sorted(range(len(rows)), key=lambda i: (rows[i]["patient_id"], scheduled_datetime(rows[i])))
    for index in ordered:
        if probability[index] < threshold:
            continue
        row = rows[index]
        patient_day = (row["patient_id"], row["dose_date"])
        scheduled_at = scheduled_datetime(row)
        gap_ok = (
            row["patient_id"] not in last_adaptive_at
            or scheduled_at - last_adaptive_at[row["patient_id"]]
            >= timedelta(hours=minimum_gap_hours)
        )
        if daily_count[patient_day] >= max_per_day or not gap_ok:
            continue
        selected[index] = True
        daily_count[patient_day] += 1
        last_adaptive_at[row["patient_id"]] = scheduled_at
    return selected


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path(".data/ml/synthetic_dose_records.csv"))
    parser.add_argument("--model-dir", type=Path, default=Path(".data/ml/model"))
    parser.add_argument("--output", type=Path, default=Path(".data/ml/model/intervention_policy.json"))
    parser.add_argument("--max-alert-rate", type=float, default=0.10)
    parser.add_argument("--min-precision", type=float, default=0.80)
    args = parser.parse_args()

    rows = load_rows(args.input)
    patient_ids = sorted({row["patient_id"] for row in rows})
    holdout_start = max(1, int(len(patient_ids) * 0.8))
    holdout_ids = set(patient_ids[holdout_start:])
    test_rows = [row for row in rows if row["patient_id"] in holdout_ids]
    matrix = np.asarray(
        [[parse_value(row[column]) for column in FEATURE_COLUMNS] for row in test_rows],
        dtype=np.float32,
    )
    truth = np.asarray([int(row["needs_support"]) for row in test_rows], dtype=np.int32)
    model = joblib.load(args.model_dir / "risk_model.joblib")
    probability = model.predict_proba(matrix)[:, 1]

    operating_points: list[dict[str, float]] = []
    for threshold in np.arange(0.05, 0.951, 0.01):
        candidate = probability >= threshold
        prediction = apply_runtime_budget(test_rows, probability, float(threshold))
        operating_points.append(
            {
                "threshold": round(float(threshold), 2),
                "alert_rate": round(float(prediction.mean()), 5),
                "precision": round(float(precision_score(truth, prediction, zero_division=0)), 5),
                "recall": round(float(recall_score(truth, prediction, zero_division=0)), 5),
                "candidate_rate": round(float(candidate.mean()), 5),
                "candidate_precision": round(
                    float(precision_score(truth, candidate, zero_division=0)), 5
                ),
            }
        )

    eligible = [
        point
        for point in operating_points
        if point["alert_rate"] <= args.max_alert_rate and point["precision"] >= args.min_precision
    ]
    if not eligible:
        raise SystemExit("no threshold satisfies the alert-rate and precision constraints")

    # The lowest eligible threshold preserves the most recall under the budget.
    selected = min(eligible, key=lambda point: point["threshold"])
    policy = {
        "model_source": "synthetic",
        "warning": "Calibrated on synthetic holdout data; do not use for clinical decisions or production alerts.",
        "risk_threshold": selected["threshold"],
        "calibration_constraints": {
            "max_alert_rate": args.max_alert_rate,
            "min_precision": args.min_precision,
        },
        "holdout_metrics": {
            "average_precision": round(float(average_precision_score(truth, probability)), 5),
            **selected,
            "budget_applied": True,
        },
        "runtime_guardrails": {
            "max_adaptive_reminders_per_patient_day": 1,
            "minimum_hours_between_adaptive_reminders": 6,
            "safety_control_bypasses_budget": True,
            "behaviour_change_is_review_signal_not_diagnosis": True,
        },
        "operating_points": operating_points,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"selected": selected, "output": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
