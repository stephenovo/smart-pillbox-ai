#!/usr/bin/env python3
"""Export mature opening-event outcomes without inventing a support label.

The export joins each final lifecycle record to the exact pre-dose feature
snapshot used by the shadow model. Observable outcomes remain separate from the
human-reviewed `needs_support` target, so they cannot silently become training
truth.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from train_adherence_model import FEATURE_COLUMNS


OUTPUT_COLUMNS = [
    "dose_id",
    "patient_id",
    "device_id",
    "dose_date",
    "compartment_id",
    "scheduled_at",
    *FEATURE_COLUMNS,
    "outcome_label",
    "outcome_revision",
    "observed_by_buffer",
    "opening_count",
    "delay_minutes",
    "safety_control_evaluation",
    "observable_adherence_target",
    "observable_target_eligible",
    "human_reviewed_needs_support_target",
    "candidate_training_eligible",
    "label_source",
    "model_version",
]

OBSERVABLE_TARGET = {
    "observed_on_time": 0,
    "observed_delayed": 0,
    "no_open_by_buffer": 1,
    "observed_very_late": 1,
}


def read_records(path: Path, key: str) -> list[dict[str, Any]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    values = payload.get(key, []) if isinstance(payload, dict) else []
    return values if isinstance(values, list) else []


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--lifecycle",
        type=Path,
        default=Path(".data/adherence-lifecycle.json"),
    )
    parser.add_argument(
        "--shadow", type=Path, default=Path(".data/adherence-shadow.json")
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".data/ml/observed/final_lifecycle_export.csv"),
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=Path(".data/ml/observed/export_metadata.json"),
    )
    args = parser.parse_args()

    lifecycles = read_records(args.lifecycle, "records")
    decisions = {
        item.get("doseId"): item
        for item in read_records(args.shadow, "decisions")
        if item.get("doseId")
    }
    exported: list[dict[str, Any]] = []
    excluded = {
        "not_final": 0,
        "missing_shadow_features": 0,
        "ambiguous_observable_label": 0,
    }
    for record in lifecycles:
        outcome = record.get("outcome") or {}
        if outcome.get("state") != "final":
            excluded["not_final"] += 1
            continue
        decision = decisions.get(record.get("doseId"))
        features = decision.get("historyFeatures") if decision else None
        if not isinstance(features, dict) or any(
            column not in features for column in FEATURE_COLUMNS
        ):
            excluded["missing_shadow_features"] += 1
            continue
        label = str(outcome.get("label", ""))
        observable_target = OBSERVABLE_TARGET.get(label)
        if observable_target is None:
            excluded["ambiguous_observable_label"] += 1
        exported.append(
            {
                "dose_id": record.get("doseId", ""),
                "patient_id": record.get("patientId", ""),
                "device_id": record.get("deviceId", ""),
                "dose_date": record.get("doseDate", ""),
                "compartment_id": record.get("compartmentId", ""),
                "scheduled_at": record.get("scheduledAt", ""),
                **{column: features[column] for column in FEATURE_COLUMNS},
                "outcome_label": label,
                "outcome_revision": outcome.get("revision", ""),
                "observed_by_buffer": int(bool(outcome.get("observedByBuffer"))),
                "opening_count": outcome.get("openingCount", ""),
                "delay_minutes": (
                    "" if outcome.get("delayMinutes") is None else outcome["delayMinutes"]
                ),
                "safety_control_evaluation": int(
                    bool(record.get("safetyControlEvaluation"))
                ),
                "observable_adherence_target": (
                    "" if observable_target is None else observable_target
                ),
                "observable_target_eligible": int(observable_target is not None),
                # This requires explicit review once real data exists.
                "human_reviewed_needs_support_target": "",
                "candidate_training_eligible": 0,
                "label_source": outcome.get("labelSource", "lid_open_events"),
                "model_version": decision.get("modelVersion", "unknown"),
            }
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(exported)

    metadata = {
        "source": "observed_lifecycle",
        "warning": "Lid openings are behavioural proxies and do not confirm ingestion.",
        "target_contract": {
            "observable_adherence_target": "Derived proxy for analysis only.",
            "human_reviewed_needs_support_target": "Required before model retraining.",
            "automatic_training_allowed": False,
        },
        "lifecycle_records": len(lifecycles),
        "exported_final_rows": len(exported),
        "candidate_training_eligible_rows": 0,
        "excluded": excluded,
        "feature_columns": FEATURE_COLUMNS,
        "output": str(args.output),
    }
    args.metadata.parent.mkdir(parents=True, exist_ok=True)
    args.metadata.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
