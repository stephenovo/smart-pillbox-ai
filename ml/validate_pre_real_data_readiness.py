#!/usr/bin/env python3
"""Issue the final engineering gate before collecting real-user data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as error:
        raise SystemExit(f"missing or invalid checkpoint: {path}: {error}") from error
    if not isinstance(payload, dict):
        raise SystemExit(f"checkpoint must be a JSON object: {path}")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model-metadata", type=Path, default=Path(".data/ml/model/metadata.json")
    )
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path(".data/ml/model/intervention_policy.json"),
    )
    parser.add_argument(
        "--replay", type=Path, default=Path(".data/ml/replay/summary.json")
    )
    parser.add_argument(
        "--candidate",
        type=Path,
        default=Path(".data/ml/continuous_learning/candidate_report.json"),
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=Path(".data/ml/continuous_learning/model_registry.json"),
    )
    parser.add_argument(
        "--stress", type=Path, default=Path(".data/ml/readiness/stress_report.json")
    )
    parser.add_argument(
        "--observed-export",
        type=Path,
        default=Path(".data/ml/observed/export_metadata.json"),
    )
    parser.add_argument(
        "--output", type=Path, default=Path(".data/ml/readiness/final_report.json")
    )
    args = parser.parse_args()

    metadata = read_json(args.model_metadata)
    policy = read_json(args.policy)
    replay = read_json(args.replay)
    candidate = read_json(args.candidate)
    registry = read_json(args.registry)
    stress = read_json(args.stress)
    observed = read_json(args.observed_export)
    runtime = policy.get("runtime_guardrails", {})
    target_contract = observed.get("target_contract", {})

    checks = {
        "synthetic_provenance_is_explicit": metadata.get("model_source")
        == "synthetic",
        "production_model_is_absent": registry.get("production_model") is None,
        "automatic_promotion_is_disabled": not registry.get(
            "automatic_promotion_enabled", True
        ),
        "candidate_was_not_promoted": not registry.get("latest_candidate", {}).get(
            "promoted", True
        ),
        "candidate_upgrade_gates_passed": bool(candidate.get("gates_passed")),
        "stress_gates_passed": bool(stress.get("gates_passed")),
        "daily_budget_replay_compliant": bool(
            replay.get("daily_budget_compliance")
        ),
        "cooldown_replay_compliant": bool(replay.get("cooldown_compliance")),
        "adaptive_daily_limit_is_one": runtime.get(
            "max_adaptive_reminders_per_patient_day"
        )
        == 1,
        "safety_control_bypasses_budget": bool(
            runtime.get("safety_control_bypasses_budget")
        ),
        "behaviour_change_is_not_diagnosis": bool(
            runtime.get("behaviour_change_is_review_signal_not_diagnosis")
        ),
        "observable_proxy_cannot_auto_train": not target_contract.get(
            "automatic_training_allowed", True
        ),
        "no_unreviewed_rows_are_training_eligible": observed.get(
            "candidate_training_eligible_rows"
        )
        == 0,
    }
    passed = all(checks.values())
    report = {
        "engineering_status": (
            "pre_real_data_complete" if passed else "pre_real_data_blocked"
        ),
        "deployment_status": "shadow_only",
        "production_ready": False,
        "automatic_retraining_enabled": False,
        "checks": checks,
        "checks_passed": passed,
        "evidence": {
            "synthetic_dose_rows": replay.get("dose_rows"),
            "candidate_status": candidate.get("candidate_status"),
            "candidate_gates": candidate.get("gates"),
            "stress_scenarios": list(
                stress.get("scenario_probability", {}).keys()
            ),
            "observed_final_rows": observed.get("exported_final_rows"),
            "reviewed_training_rows": observed.get(
                "candidate_training_eligible_rows"
            ),
        },
        "real_data_blockers": [
            "Probability calibration on real opening-event distributions.",
            "Human-reviewed needs_support labels; opening events alone are proxies.",
            "Patient time zones and durable plan-version history.",
            "Subgroup performance and fairness evaluation.",
            "Causal evidence that an adaptive reminder helps rather than adds fatigue.",
            "Durable database, protected scheduler/queue, audit log, and concurrency control.",
            "Clinical governance for any health or memory-related interpretation.",
        ],
        "next_allowed_stage": (
            "real-user shadow collection" if passed else "repair failed checks"
        ),
        "warning": "Passing this gate is engineering readiness, not clinical validation.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit("pre-real-data readiness gate failed")


if __name__ == "__main__":
    main()
