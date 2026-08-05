#!/usr/bin/env python3
"""Train and evaluate synthetic adherence baselines.

The model is deliberately labelled synthetic in its metadata. It is a
pipeline checkpoint, not a production clinical model.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor


FEATURE_COLUMNS = [
    "scheduled_minutes",
    "day_of_week",
    "is_weekend",
    "is_evening",
    "high_risk",
    "buffer_minutes",
    "device_online",
    "event_upload_delay_minutes",
    "history_count_7d",
    "history_taken_rate_7d",
    "history_missed_count_7d",
    "history_duplicate_count_28d",
    "history_median_delay_7d",
    "history_delay_trend_7d",
    "days_since_last_missed",
]


def parse_value(value: str) -> float:
    return 0.0 if value == "" else float(value)


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def create_model(kind: str, seed: int) -> Any:
    try:
        from xgboost import XGBClassifier, XGBRegressor
    except Exception:
        XGBClassifier = None
        XGBRegressor = None

    if XGBClassifier is not None and XGBRegressor is not None:
        if kind == "classifier":
            return XGBClassifier(
                n_estimators=260,
                max_depth=4,
                learning_rate=0.05,
                subsample=0.85,
                colsample_bytree=0.85,
                objective="binary:logistic",
                eval_metric="logloss",
                random_state=seed,
                n_jobs=4,
            )
        return XGBRegressor(
            n_estimators=260,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
                objective="reg:squarederror",
                eval_metric="mae",
                random_state=seed,
                n_jobs=4,
            )

    if kind == "classifier":
        return HistGradientBoostingClassifier(
            max_iter=260, max_leaf_nodes=24, learning_rate=0.05, random_state=seed
        )
    return HistGradientBoostingRegressor(
        max_iter=260, max_leaf_nodes=24, learning_rate=0.05, random_state=seed
    )


def metric_or_none(fn: Any, y_true: np.ndarray, y_score: np.ndarray) -> float | None:
    try:
        return round(float(fn(y_true, y_score)), 5)
    except ValueError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path(".data/ml/synthetic_dose_records.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path(".data/ml/model"))
    parser.add_argument("--seed", type=int, default=20260805)
    args = parser.parse_args()

    rows = load_rows(args.input)
    if not rows:
        raise SystemExit("input dataset is empty")

    patient_ids = sorted({row["patient_id"] for row in rows})
    holdout_start = max(1, int(len(patient_ids) * 0.8))
    train_patients = set(patient_ids[:holdout_start])
    train_rows = [row for row in rows if row["patient_id"] in train_patients]
    test_rows = [row for row in rows if row["patient_id"] not in train_patients]

    def matrix(items: list[dict[str, str]]) -> np.ndarray:
        return np.asarray(
            [[parse_value(item[column]) for column in FEATURE_COLUMNS] for item in items],
            dtype=np.float32,
        )

    x_train = matrix(train_rows)
    x_test = matrix(test_rows)
    y_train = np.asarray([int(row["needs_support"]) for row in train_rows], dtype=np.int32)
    y_test = np.asarray([int(row["needs_support"]) for row in test_rows], dtype=np.int32)
    change_train = np.asarray(
        [int(row["behaviour_change_signal"]) for row in train_rows], dtype=np.int32
    )
    change_test = np.asarray(
        [int(row["behaviour_change_signal"]) for row in test_rows], dtype=np.int32
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    risk_model = create_model("classifier", args.seed)
    risk_model.fit(x_train, y_train)
    risk_probability = risk_model.predict_proba(x_test)[:, 1]
    risk_prediction = (risk_probability >= 0.5).astype(np.int32)

    change_model = create_model("classifier", args.seed + 1)
    change_model.fit(x_train, change_train)
    change_probability = change_model.predict_proba(x_test)[:, 1]

    regression_rows_train = [row for row in train_rows if row["actual_delay_minutes"] != ""]
    regression_rows_test = [row for row in test_rows if row["actual_delay_minutes"] != ""]
    delay_model = create_model("regressor", args.seed + 2)
    delay_model.fit(matrix(regression_rows_train), np.asarray(
        [float(row["actual_delay_minutes"]) for row in regression_rows_train], dtype=np.float32
    ))
    delay_prediction = delay_model.predict(matrix(regression_rows_test))
    delay_truth = np.asarray(
        [float(row["actual_delay_minutes"]) for row in regression_rows_test], dtype=np.float32
    )

    try:
        import xgboost  # type: ignore

        backend = f"xgboost-{xgboost.__version__}"
    except Exception:
        backend = "sklearn-hist-gradient-boosting"

    metrics = {
        "dataset": "synthetic",
        "train_rows": len(train_rows),
        "test_rows": len(test_rows),
        "train_patients": len(train_patients),
        "test_patients": len(patient_ids) - len(train_patients),
        "risk_target": "needs_support",
        "risk": {
            "positive_rate_test": round(float(y_test.mean()), 5),
            "roc_auc": metric_or_none(roc_auc_score, y_test, risk_probability),
            "pr_auc": metric_or_none(average_precision_score, y_test, risk_probability),
            "brier": round(float(brier_score_loss(y_test, risk_probability)), 5),
            "recall_at_0.5": round(float(recall_score(y_test, risk_prediction, zero_division=0)), 5),
            "precision_at_0.5": round(float(precision_score(y_test, risk_prediction, zero_division=0)), 5),
        },
        "behaviour_change": {
            "positive_rate_test": round(float(change_test.mean()), 5),
            "roc_auc": metric_or_none(roc_auc_score, change_test, change_probability),
            "pr_auc": metric_or_none(average_precision_score, change_test, change_probability),
            "brier": round(float(brier_score_loss(change_test, change_probability)), 5),
        },
        "delay_regression": {
            "test_rows": len(regression_rows_test),
            "mae_minutes": round(float(mean_absolute_error(delay_truth, delay_prediction)), 5),
            "rmse_minutes": round(float(mean_squared_error(delay_truth, delay_prediction) ** 0.5), 5),
        },
    }

    joblib.dump(risk_model, args.output_dir / "risk_model.joblib")
    joblib.dump(change_model, args.output_dir / "behaviour_change_model.joblib")
    joblib.dump(delay_model, args.output_dir / "delay_model.joblib")
    (args.output_dir / "metadata.json").write_text(
        json.dumps(
            {
                "model_source": "synthetic",
                "warning": "Do not use for clinical decisions or production alerts.",
                "feature_columns": FEATURE_COLUMNS,
                "backend": backend,
                "seed": args.seed,
                "metrics": metrics,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(metrics, indent=2))
    print(f"saved models to {args.output_dir}")


if __name__ == "__main__":
    main()
