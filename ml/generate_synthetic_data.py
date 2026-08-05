#!/usr/bin/env python3
"""Generate synthetic, dose-level adherence data for pipeline development.

This simulator intentionally models behaviour and device imperfections so the
training pipeline can be exercised before real events exist. The output is
marked synthetic and must never be treated as clinical evidence.
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from collections import defaultdict, deque
from datetime import date, timedelta
from pathlib import Path


SCHEDULES = (
    (1, "morning", "08:00", True, 30, 0.0),
    (2, "midday", "13:00", False, 60, 4.0),
    # Evening routines can run a little later, but should not be labelled as
    # support-worthy solely because their baseline delay is larger.
    (3, "evening", "19:00", False, 60, 8.0),
)

PERSONAS = {
    "steady": 0.50,
    "slow_but_consistent": 0.18,
    "variable": 0.17,
    "forgetting_drift": 0.08,
    "device_noise": 0.07,
}

FIELDNAMES = [
    "dose_id",
    "patient_id",
    "dose_date",
    "day_index",
    "compartment_id",
    "routine",
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
    "natural_delay_minutes",
    "actual_delay_minutes",
    "opening_count",
    "reminder_count",
    "opened_after_reminder",
    "status",
    "needs_support",
    "natural_missed",
    "behaviour_change_signal",
    "latent_persona",
]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def median(values: deque[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def parse_hhmm(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def choose_persona(rng: random.Random) -> str:
    names = list(PERSONAS)
    weights = list(PERSONAS.values())
    return rng.choices(names, weights=weights, k=1)[0]


def delay_status_threshold(routine: str) -> float:
    return {
        "morning": 10.0,
        "midday": 12.0,
        "evening": 12.0,
    }[routine]


def support_delay_threshold(routine: str, high_risk: bool) -> float:
    threshold = {
        "morning": 24.0,
        "midday": 30.0,
        "evening": 30.0,
    }[routine]
    return threshold - (6.0 if high_risk else 0.0)


def history_features(
    delays: deque[float], missed_days: deque[int], duplicates: deque[int]
) -> dict[str, float]:
    valid_delays = [delay for delay in delays if delay >= 0]
    recent = valid_delays[-3:]
    older = valid_delays[:-3]
    trend = (sum(recent) / len(recent) - sum(older) / len(older)) if recent and older else 0.0
    return {
        "history_count_7d": float(len(missed_days)),
        "history_taken_rate_7d": float(
            sum(1 for day in missed_days if day == 0) / len(missed_days)
            if missed_days
            else 1.0
        ),
        "history_missed_count_7d": float(sum(missed_days)),
        "history_duplicate_count_28d": float(sum(duplicates)),
        "history_median_delay_7d": round(median(deque(valid_delays[-7:])), 2),
        "history_delay_trend_7d": round(trend, 2),
    }


def generate_records(user_count: int, days: int, seed: int, start_date: date) -> list[dict[str, object]]:
    rng = random.Random(seed)
    records: list[dict[str, object]] = []

    for user_number in range(user_count):
        patient_id = f"synthetic-{user_number + 1:06d}"
        persona = choose_persona(rng)
        change_start = rng.randint(max(15, days // 3), max(16, days - 15))
        change_duration = rng.randint(10, 26)
        health_episode_active = rng.random() < 0.12
        health_episode_start = (
            rng.randint(max(12, days // 4), max(13, days - 12)) if health_episode_active else None
        )
        health_episode_duration = rng.randint(6, 18) if health_episode_active else 0
        base_miss_bias = {
            "steady": -3.7,
            "slow_but_consistent": -3.3,
            "variable": -2.7,
            "forgetting_drift": -3.0,
            "device_noise": -3.1,
        }[persona]
        base_delay_shift = rng.gauss(0.0, 2.3)

        delays: dict[int, deque[float]] = defaultdict(lambda: deque(maxlen=7))
        missed_days: dict[int, deque[int]] = defaultdict(lambda: deque(maxlen=7))
        duplicates: dict[int, deque[int]] = defaultdict(lambda: deque(maxlen=28))
        last_missed_day: dict[int, int | None] = defaultdict(lambda: None)

        for day_index in range(days):
            current_date = start_date + timedelta(days=day_index)
            day_of_week = current_date.weekday()
            weekend = day_of_week >= 5
            forgetting_change_active = (
                persona == "forgetting_drift"
                and change_start <= day_index < change_start + change_duration
            )
            health_episode_active_now = (
                health_episode_start is not None
                and health_episode_start <= day_index < health_episode_start + health_episode_duration
            )
            change_active = forgetting_change_active or health_episode_active_now

            for compartment, routine, scheduled_time, high_risk, buffer, routine_bias in SCHEDULES:
                scheduled_minutes = parse_hhmm(scheduled_time)
                history = history_features(
                    delays[compartment], missed_days[compartment], duplicates[compartment]
                )
                days_since_missed = (
                    day_index - last_missed_day[compartment]
                    if last_missed_day[compartment] is not None
                    else 30
                )

                device_online = not (
                    persona == "device_noise" and rng.random() < 0.10
                )
                upload_delay = rng.randint(0, 3) if device_online else rng.randint(4, 90)

                drift_minutes = 0.0
                if forgetting_change_active:
                    drift_minutes = 6.0 + max(0.0, day_index - change_start) * 0.55
                if health_episode_active_now:
                    drift_minutes += 7.0
                health_shock = health_episode_active_now and rng.random() < 0.10
                if health_shock:
                    drift_minutes += rng.uniform(8, 18)

                miss_logit = (
                    base_miss_bias
                    + (0.22 if weekend and routine == "morning" else 0.0)
                    + (0.28 if routine == "evening" else 0.0)
                    + (0.42 if high_risk else 0.0)
                    + (0.11 * history["history_missed_count_7d"])
                    + (0.07 * max(0.0, history["history_delay_trend_7d"]))
                    + (0.04 * drift_minutes)
                    + (0.24 if health_shock else 0.0)
                )
                natural_missed = rng.random() < sigmoid(miss_logit)

                if natural_missed:
                    natural_delay: float | None = None
                else:
                    mean_delay = {
                        "steady": 3.5,
                        "slow_but_consistent": 8.5,
                        "variable": 10.5,
                        "forgetting_drift": 6.0,
                        "device_noise": 7.0,
                    }[persona]
                    spread = {
                        "steady": 2.8,
                        "slow_but_consistent": 4.2,
                        "variable": 8.5,
                        "forgetting_drift": 4.6,
                        "device_noise": 5.2,
                    }[persona]
                    natural_delay = max(
                        -5.0,
                        round(rng.gauss(mean_delay + routine_bias + base_delay_shift + drift_minutes, spread), 1),
                    )

                delay_support_threshold = support_delay_threshold(routine, high_risk)
                sustained_pattern = (
                    history["history_count_7d"] >= 5
                    and history["history_taken_rate_7d"] < 0.68
                    and history["history_missed_count_7d"] >= 2
                )
                trend_concern = (
                    history["history_median_delay_7d"] > 16.0
                    and history["history_delay_trend_7d"] > 5.5
                )
                needs_support = int(
                    natural_missed
                    or (natural_delay is not None and natural_delay > delay_support_threshold)
                    or sustained_pattern
                    or trend_concern
                    or (change_active and natural_delay is not None and natural_delay > (delay_support_threshold - 1.5))
                )
                reminder_count = 0 if not needs_support else (2 if natural_missed else 1)

                opened_after_reminder = int(
                    needs_support and not natural_missed and reminder_count > 0
                )
                actual_delay = natural_delay
                if natural_missed and rng.random() < 0.24:
                    # A late recovery is still a missed/very-late outcome.
                    actual_delay = round(buffer + rng.uniform(5, 45), 1)
                    opened_after_reminder = 1

                opening_count = 0 if actual_delay is None else 1
                duplicate_probability = 0.015
                if persona in {"variable", "forgetting_drift"}:
                    duplicate_probability += 0.045
                if change_active:
                    duplicate_probability += 0.015
                if health_shock:
                    duplicate_probability += 0.03
                if opening_count and rng.random() < duplicate_probability:
                    opening_count = 2

                if opening_count == 0 or actual_delay is None or actual_delay > buffer:
                    status = "missed"
                elif opening_count >= 2:
                    status = "duplicate_opening"
                elif actual_delay > delay_status_threshold(routine):
                    status = "taken_delayed"
                else:
                    status = "taken_on_time"

                records.append(
                    {
                        "dose_id": f"dose-{user_number + 1:06d}-{day_index:03d}-{compartment}",
                        "patient_id": patient_id,
                        "dose_date": current_date.isoformat(),
                        "day_index": day_index,
                        "compartment_id": compartment,
                        "routine": routine,
                        "scheduled_minutes": scheduled_minutes,
                        "day_of_week": day_of_week,
                        "is_weekend": int(weekend),
                        "is_evening": int(routine == "evening"),
                        "high_risk": int(high_risk),
                        "buffer_minutes": buffer,
                        "device_online": int(device_online),
                        "event_upload_delay_minutes": upload_delay,
                        **history,
                        "days_since_last_missed": days_since_missed,
                        "natural_delay_minutes": "" if natural_delay is None else natural_delay,
                        "actual_delay_minutes": "" if actual_delay is None else actual_delay,
                        "opening_count": opening_count,
                        "reminder_count": reminder_count,
                        "opened_after_reminder": opened_after_reminder,
                        "status": status,
                        "needs_support": needs_support,
                        "natural_missed": int(natural_missed),
                        "behaviour_change_signal": int(change_active),
                        "latent_persona": persona,
                    }
                )

                valid_delay = -1.0 if actual_delay is None else actual_delay
                delays[compartment].append(valid_delay)
                missed_days[compartment].append(int(status == "missed"))
                duplicates[compartment].append(int(opening_count >= 2))
                if status == "missed":
                    last_missed_day[compartment] = day_index

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--users", type=int, default=2000)
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--seed", type=int, default=20260805)
    parser.add_argument("--start-date", default="2025-01-01")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".data/ml/synthetic_dose_records.csv"),
    )
    args = parser.parse_args()
    if args.users < 1 or args.days < 30:
        raise SystemExit("users must be positive and days must be at least 30")

    records = generate_records(
        args.users,
        args.days,
        args.seed,
        date.fromisoformat(args.start_date),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(records)

    print(f"wrote {len(records):,} synthetic dose records to {args.output}")
    print(f"seed={args.seed} users={args.users} days={args.days}")


if __name__ == "__main__":
    main()
