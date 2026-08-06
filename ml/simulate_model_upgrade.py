#!/usr/bin/env python3
"""Simulate champion/candidate learning with temporal and patient separation.

The candidate is never promoted automatically. This script proves the upgrade
workflow and writes a registry entry that is eligible only for extended shadow
evaluation when every gate passes.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)

from calibrate_intervention_policy import apply_runtime_budget
from train_adherence_model import FEATURE_COLUMNS, create_model, load_rows, parse_value


def matrix(rows: list[dict[str, str]]) -> np.ndarray:
    return np.asarray(
        [[parse_value(row[column]) for column in FEATURE_COLUMNS] for row in rows],
        dtype=np.float32,
    )


def rounded(value: float) -> float:
    return round(float(value), 5)


def evaluate(
    model: Any,
    rows: list[dict[str, str]],
    threshold: float,
) -> dict[str, float]:
    truth = np.asarray([int(row["needs_support"]) for row in rows], dtype=np.int32)
    probability = model.predict_proba(matrix(rows))[:, 1]
    candidate = probability >= threshold
    allowed = apply_runtime_budget(rows, probability, threshold)
    stable_negative = np.asarray(
        [
            row.get("latent_persona") == "steady" and int(row["needs_support"]) == 0
            for row in rows
        ],
        dtype=bool,
    )
    patient_days = len({(row["patient_id"], row["dose_date"]) for row in rows})
    return {
        "positive_rate": rounded(truth.mean()),
        "roc_auc": rounded(roc_auc_score(truth, probability)),
        "pr_auc": rounded(average_precision_score(truth, probability)),
        "brier": rounded(brier_score_loss(truth, probability)),
        "candidate_rate": rounded(candidate.mean()),
        "candidate_precision": rounded(
            precision_score(truth, candidate, zero_division=0)
        ),
        "candidate_recall": rounded(recall_score(truth, candidate, zero_division=0)),
        "allowed_rate": rounded(allowed.mean()),
        "allowed_precision": rounded(
            precision_score(truth, allowed, zero_division=0)
        ),
        "allowed_recall": rounded(recall_score(truth, allowed, zero_division=0)),
        "allowed_per_patient_day": rounded(allowed.sum() / max(1, patient_days)),
        "stable_negative_false_positive_rate": rounded(
            candidate[stable_negative].mean() if stable_negative.any() else 0.0
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, default=Path(".data/ml/synthetic_dose_records.csv")
    )
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path(".data/ml/model/intervention_policy.json"),
    )
    parser.add_argument(
        "--model-metadata",
        type=Path,
        default=Path(".data/ml/model/metadata.json"),
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path(".data/ml/continuous_learning")
    )
    parser.add_argument("--seed", type=int, default=20260806)
    parser.add_argument("--champion-days", type=int, default=60)
    parser.add_argument("--candidate-days", type=int, default=75)
    args = parser.parse_args()

    rows = load_rows(args.input)
    policy = json.loads(args.policy.read_text(encoding="utf-8"))
    model_metadata = json.loads(args.model_metadata.read_text(encoding="utf-8"))
    threshold = float(policy["risk_threshold"])
    patients = sorted({row["patient_id"] for row in rows})
    train_end = max(1, int(len(patients) * 0.8))
    train_patients = set(patients[:train_end])
    evaluation_patients = set(patients[train_end:])
    champion_rows = [
        row
        for row in rows
        if row["patient_id"] in train_patients
        and int(row["day_index"]) < args.champion_days
    ]
    candidate_rows = [
        row
        for row in rows
        if row["patient_id"] in train_patients
        and int(row["day_index"]) < args.candidate_days
    ]
    evaluation_rows = [
        row
        for row in rows
        if row["patient_id"] in evaluation_patients
        and int(row["day_index"]) >= args.candidate_days
    ]
    if not champion_rows or not candidate_rows or not evaluation_rows:
        raise SystemExit("temporal split produced an empty partition")

    champion = create_model("classifier", args.seed)
    champion.fit(
        matrix(champion_rows),
        np.asarray([int(row["needs_support"]) for row in champion_rows]),
    )
    candidate = create_model("classifier", args.seed + 1)
    candidate.fit(
        matrix(candidate_rows),
        np.asarray([int(row["needs_support"]) for row in candidate_rows]),
    )
    champion_metrics = evaluate(champion, evaluation_rows, threshold)
    candidate_metrics = evaluate(candidate, evaluation_rows, threshold)

    gates = {
        "pr_auc_not_regressed": candidate_metrics["pr_auc"]
        >= champion_metrics["pr_auc"] - 0.01,
        "calibration_not_regressed": candidate_metrics["brier"]
        <= champion_metrics["brier"] + 0.005,
        "allowed_precision_floor": candidate_metrics["allowed_precision"] >= 0.75,
        "daily_intervention_ceiling": candidate_metrics["allowed_per_patient_day"]
        <= 0.35,
        "stable_routine_false_positive_ceiling": candidate_metrics[
            "stable_negative_false_positive_rate"
        ]
        <= max(
            0.05,
            champion_metrics["stable_negative_false_positive_rate"] + 0.01,
        ),
    }
    gates_passed = all(gates.values())
    candidate_version = f"synthetic-temporal-candidate-{args.seed}-d{args.candidate_days}"
    champion_version = (
        f"synthetic-{model_metadata.get('seed', 'unknown')}-"
        f"{model_metadata.get('backend', 'unknown')}"
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(champion, args.output_dir / "champion_temporal_model.joblib")
    joblib.dump(candidate, args.output_dir / "candidate_risk_model.joblib")
    report = {
        "model_source": "synthetic",
        "warning": "Workflow simulation only; no candidate may trigger real reminders.",
        "split": {
            "train_patient_count": len(train_patients),
            "evaluation_patient_count": len(evaluation_patients),
            "champion_training_days": args.champion_days,
            "candidate_training_days": args.candidate_days,
            "champion_train_rows": len(champion_rows),
            "candidate_train_rows": len(candidate_rows),
            "evaluation_rows": len(evaluation_rows),
            "evaluation_starts_at_day": args.candidate_days,
            "patient_holdout": True,
            "temporal_holdout": True,
        },
        "risk_threshold": threshold,
        "simulation_seed": args.seed,
        "champion_metrics": champion_metrics,
        "candidate_metrics": candidate_metrics,
        "gates": gates,
        "gates_passed": gates_passed,
        "candidate_status": (
            "eligible_for_extended_shadow" if gates_passed else "rejected"
        ),
        "automatic_promotion": False,
        "candidate_version": candidate_version,
    }
    (args.output_dir / "candidate_report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    registry = {
        "schema_version": 1,
        "production_model": None,
        "automatic_promotion_enabled": False,
        "human_approval_required": True,
        "shadow_champion": {
            "version": champion_version,
            "path": ".data/ml/model/risk_model.joblib",
            "source": "synthetic",
            "status": "shadow_only",
        },
        "latest_candidate": {
            "version": candidate_version,
            "path": str(args.output_dir / "candidate_risk_model.joblib"),
            "source": "synthetic",
            "status": report["candidate_status"],
            "gates_passed": gates_passed,
            "promoted": False,
        },
    }
    (args.output_dir / "model_registry.json").write_text(
        json.dumps(registry, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
