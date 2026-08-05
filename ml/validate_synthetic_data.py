#!/usr/bin/env python3
"""Validate synthetic adherence distributions against broad design guardrails."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


def rate(counts: dict[str, int]) -> float:
    return counts["positive"] / counts["total"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(".data/ml/synthetic_dose_records.csv"),
    )
    args = parser.parse_args()

    totals = {"total": 0, "support": 0, "missed": 0}
    persona_support: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "positive": 0}
    )
    persona_change: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "positive": 0}
    )
    routine_support: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "positive": 0}
    )

    with args.input.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            support = int(row["needs_support"])
            change = int(row["behaviour_change_signal"])
            persona = row["latent_persona"]
            routine = row["routine"]

            totals["total"] += 1
            totals["support"] += support
            totals["missed"] += int(row["natural_missed"])
            persona_support[persona]["total"] += 1
            persona_support[persona]["positive"] += support
            persona_change[persona]["total"] += 1
            persona_change[persona]["positive"] += change
            routine_support[routine]["total"] += 1
            routine_support[routine]["positive"] += support

    if totals["total"] == 0:
        raise SystemExit("input dataset is empty")

    summary = {
        "rows": totals["total"],
        "support_rate": round(totals["support"] / totals["total"], 5),
        "natural_missed_rate": round(totals["missed"] / totals["total"], 5),
        "support_rate_by_persona": {
            key: round(rate(value), 5) for key, value in sorted(persona_support.items())
        },
        "change_rate_by_persona": {
            key: round(rate(value), 5) for key, value in sorted(persona_change.items())
        },
        "support_rate_by_routine": {
            key: round(rate(value), 5) for key, value in sorted(routine_support.items())
        },
    }

    failures: list[str] = []
    if not 0.08 <= summary["support_rate"] <= 0.18:
        failures.append("overall support rate must stay between 8% and 18%")
    if not 0.04 <= summary["natural_missed_rate"] <= 0.10:
        failures.append("natural missed rate must stay between 4% and 10%")
    if summary["support_rate_by_persona"].get("steady", 1.0) > 0.08:
        failures.append("steady persona support rate must stay at or below 8%")
    if summary["support_rate_by_persona"].get("variable", 0.0) < 0.25:
        failures.append("variable persona support rate must stay at or above 25%")
    if summary["change_rate_by_persona"].get("forgetting_drift", 0.0) < 0.12:
        failures.append("forgetting drift change rate must stay at or above 12%")

    routine_rates = list(summary["support_rate_by_routine"].values())
    if max(routine_rates) - min(routine_rates) > 0.10:
        failures.append("routine support rates must stay within 10 percentage points")

    summary["guardrails_passed"] = not failures
    summary["failures"] = failures
    print(json.dumps(summary, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
