# Adherence Pre-real-data Readiness

This checkpoint defines the maximum defensible engineering work before real
user data exists. Passing it means the system is ready to collect data in
Shadow mode. It does not mean the model is clinically or operationally ready.

## Completed engineering loop

1. Generate and validate diverse synthetic dose histories.
2. Train risk, behaviour-change, and delay models with patient holdout.
3. Calibrate a conservative risk threshold and reminder budget.
4. Replay device-shaped events without exposing synthetic labels to ingestion.
5. Rebuild features from only the events available before each dose.
6. Score upcoming doses through a live local model service.
7. Label opening outcomes provisionally after the buffer and finally after 24
   hours, with revisions for late-arriving events.
8. Export mature outcomes while keeping observable proxies separate from the
   reviewed `needs_support` target.
9. Compare temporal champion and candidate models on held-out patients.
10. Apply promotion, calibration, stable-routine, and intervention-budget gates.
11. Stress the model with offline devices, upload backlog, duplicate sensors,
    cold starts, worsening history, and clock shifts.
12. Issue a machine-readable readiness report that always keeps production
    readiness false until real-data blockers are resolved.

## One-command checkpoint

After generating the baseline synthetic data and models:

```bash
/tmp/smart-pillbox-ml-venv/bin/python ml/run_pre_real_data_checkpoint.py
```

The final report is written to:

```text
.data/ml/readiness/final_report.json
```

Expected status before a real-user pilot:

```json
{
  "engineering_status": "pre_real_data_complete",
  "deployment_status": "shadow_only",
  "production_ready": false,
  "automatic_retraining_enabled": false,
  "next_allowed_stage": "real-user shadow collection"
}
```

## Candidate promotion boundary

Automated gates may mark a candidate `eligible_for_extended_shadow`. They never
replace the current Shadow champion and never activate reminders. The registry
keeps `production_model: null` and `automatic_promotion_enabled: false`.

## What real data must answer

- Are risk probabilities calibrated to actual opening behaviour?
- Which observed outcomes truly need extra support?
- Does an adaptive reminder improve behaviour without adding alert fatigue?
- Are performance and false-positive rates acceptable across subgroups?
- How should device outages and household routines affect confidence?
- Is a sustained behaviour change meaningful after caregiver review?

No opening pattern may be presented as a diagnosis of memory loss or another
medical condition. Such interpretations require separate governance and
appropriate professional evidence.

## Production infrastructure still required

- Durable database with immutable plan versions
- Patient-specific timezone handling
- Authenticated device and internal worker endpoints
- Protected cron or queue scheduler with concurrency control
- Model registry audit log, approval workflow, rollback, and monitoring
- Privacy, consent, retention, and incident-response policies
