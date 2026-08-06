#!/usr/bin/env python3
"""Stress the synthetic shadow model with device and history perturbations."""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import joblib
import numpy as np

from train_adherence_model import FEATURE_COLUMNS, parse_value


def reservoir_sample(path: Path, size: int, seed: int) -> list[dict[str, str]]:
    rng = random.Random(seed)
    sample: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle)):
            if index < size:
                sample.append(row)
                continue
            replacement = rng.randint(0, index)
            if replacement < size:
                sample[replacement] = row
    return sample


def matrix(rows: list[dict[str, float]]) -> np.ndarray:
    return np.asarray(
        [[row[column] for column in FEATURE_COLUMNS] for row in rows],
        dtype=np.float32,
    )


def percentile_summary(probability: np.ndarray) -> dict[str, float]:
    return {
        "minimum": round(float(probability.min()), 6),
        "p50": round(float(np.quantile(probability, 0.50)), 6),
        "p90": round(float(np.quantile(probability, 0.90)), 6),
        "p99": round(float(np.quantile(probability, 0.99)), 6),
        "maximum": round(float(probability.max()), 6),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, default=Path(".data/ml/synthetic_dose_records.csv")
    )
    parser.add_argument(
        "--model", type=Path, default=Path(".data/ml/model/risk_model.joblib")
    )
    parser.add_argument(
        "--output", type=Path, default=Path(".data/ml/readiness/stress_report.json")
    )
    parser.add_argument("--sample-size", type=int, default=5_000)
    parser.add_argument("--seed", type=int, default=20260806)
    args = parser.parse_args()

    raw_rows = reservoir_sample(args.input, args.sample_size, args.seed)
    baseline = [
        {column: parse_value(row[column]) for column in FEATURE_COLUMNS}
        for row in raw_rows
    ]
    scenarios: dict[str, list[dict[str, float]]] = {
        "baseline": baseline,
        "device_offline_upload_backlog": [
            {**row, "device_online": 0.0, "event_upload_delay_minutes": 90.0}
            for row in baseline
        ],
        "worsened_recent_history": [
            {
                **row,
                "history_count_7d": 7.0,
                "history_taken_rate_7d": min(row["history_taken_rate_7d"], 0.43),
                "history_missed_count_7d": max(
                    row["history_missed_count_7d"], 4.0
                ),
                "history_median_delay_7d": max(
                    row["history_median_delay_7d"], 20.0
                ),
                "history_delay_trend_7d": max(
                    row["history_delay_trend_7d"], 10.0
                ),
                "days_since_last_missed": 1.0,
            }
            for row in baseline
        ],
        "duplicate_sensor_burst": [
            {**row, "history_duplicate_count_28d": 7.0} for row in baseline
        ],
        "cold_start": [
            {
                **row,
                "history_count_7d": 0.0,
                "history_taken_rate_7d": 1.0,
                "history_missed_count_7d": 0.0,
                "history_duplicate_count_28d": 0.0,
                "history_median_delay_7d": 0.0,
                "history_delay_trend_7d": 0.0,
                "days_since_last_missed": 30.0,
            }
            for row in baseline
        ],
        "clock_and_weekend_shift": [
            {
                **row,
                "scheduled_minutes": float(
                    min(1_439, max(0, int(row["scheduled_minutes"]) + 60))
                ),
                "day_of_week": float((int(row["day_of_week"]) + 2) % 7),
                "is_weekend": float(
                    ((int(row["day_of_week"]) + 2) % 7) >= 5
                ),
            }
            for row in baseline
        ],
    }
    model = joblib.load(args.model)
    probabilities = {
        name: model.predict_proba(matrix(rows))[:, 1]
        for name, rows in scenarios.items()
    }
    all_values = np.concatenate(list(probabilities.values()))
    finite_and_bounded = bool(
        np.isfinite(all_values).all()
        and (all_values >= 0).all()
        and (all_values <= 1).all()
    )
    monotonic_fraction = float(
        (
            probabilities["worsened_recent_history"]
            >= probabilities["baseline"] - 1e-9
        ).mean()
    )
    gates = {
        "all_predictions_finite_and_bounded": finite_and_bounded,
        "feature_contract_complete": all(
            set(row) == set(FEATURE_COLUMNS)
            for rows in scenarios.values()
            for row in rows[:10]
        ),
        "worsened_history_directionality": monotonic_fraction >= 0.80,
    }
    report = {
        "model_source": "synthetic",
        "warning": "Stress results verify robustness, not real-world validity.",
        "sample_size": len(baseline),
        "feature_count": len(FEATURE_COLUMNS),
        "scenario_probability": {
            name: percentile_summary(values)
            for name, values in probabilities.items()
        },
        "worsened_history_non_decreasing_fraction": round(monotonic_fraction, 5),
        "gates": gates,
        "gates_passed": all(gates.values()),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["gates_passed"]:
        raise SystemExit("model stress gates failed")


if __name__ == "__main__":
    main()
