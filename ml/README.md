# Synthetic Adherence ML Checkpoint

This directory contains the first offline training checkpoint for the
adherence feature. It is intentionally separate from the Next.js runtime.

The generator creates dose-level records for several latent behaviour
profiles, including stable routines, slow-but-consistent routines, variable
behaviour, gradual adherence drift, and device upload noise. It also creates
history features using only observations available before the current dose,
so the baseline does not deliberately leak the current outcome.

The `needs_support` target is intentionally narrower than "late dose". It
represents intervention-worthy patterns such as missed doses, repeated late
openings, sustained drift, or concern in a high-risk context. That keeps the
synthetic world closer to the product goal of minimizing alert fatigue.

The trainer builds three models:

- `risk_model.joblib`: probability that the dose needs support
- `behaviour_change_model.joblib`: probability of a synthetic sustained-change signal
- `delay_model.joblib`: expected opening delay for doses that were opened

All outputs are written under `.data/ml/`, which is ignored by git. Model
metadata records `model_source: synthetic` and the metrics are for pipeline
verification only. The models must stay in shadow mode until real hardware
events are collected and the model is retrained or calibrated on them.

## Run

```bash
python3 -m venv /tmp/smart-pillbox-ml-venv
/tmp/smart-pillbox-ml-venv/bin/pip install -r ml/requirements.txt
/tmp/smart-pillbox-ml-venv/bin/python ml/generate_synthetic_data.py
/tmp/smart-pillbox-ml-venv/bin/python ml/validate_synthetic_data.py
/tmp/smart-pillbox-ml-venv/bin/python ml/train_adherence_model.py
/tmp/smart-pillbox-ml-venv/bin/python ml/calibrate_intervention_policy.py
/tmp/smart-pillbox-ml-venv/bin/python ml/replay_hardware_events.py
/tmp/smart-pillbox-ml-venv/bin/python ml/serve_adherence_model.py
```

The default run generates 2,000 synthetic users for 90 days (540,000 dose
records), uses a patient-level holdout, and writes metrics to
`.data/ml/model/metadata.json`.

The validator applies broad product guardrails rather than claiming a real
population distribution. It keeps the support target sparse, ensures stable
routines rarely trigger support, preserves detectable change personas, and
guards against one medication time dominating the labels.
The risk model is only a ranking signal. The calibration step writes a synthetic
checkpoint to `.data/ml/model/intervention_policy.json` with a conservative
threshold and runtime reminder budget. Safety Control remains a separate,
hard-coded path and is never replaced by this policy.

The replay step writes device-shaped JSONL events and shadow decisions under
`.data/ml/replay/`. Hardware events intentionally omit synthetic labels; the
shadow file and summary retain labels only for offline evaluation.

It also writes `.data/ml/replay/demo_bundle.json`, a compact 14-day scenario
around the first detected change for a synthetic `forgetting_drift` patient,
plus up to 28 preceding days of label-free opening events for feature warmup.
The local Next.js replay endpoint uses this bundle for fast end-to-end testing.

The model server uses only Python's standard HTTP server plus the existing ML
dependencies. It binds to `127.0.0.1:8010` by default and exposes `/health` and
`/predict`. Start it before selecting **Run shadow replay**. The Next.js route
reconstructs every feature snapshot from the opening events that occurred
before that dose, calls this service, then applies the saved threshold, daily
budget, and cooldown. It does not reuse the probabilities stored by the offline
replay script.

Development hardware POSTs also score the next scheduled dose on a best-effort
basis. Decisions are written to `.data/adherence-shadow.json` and can be read
through `GET /api/adherence/shadow?patientId=...`. This read endpoint and the
replay endpoint return `404` outside development. Model failure never rejects a
hardware event, and no Shadow decision sends a reminder.
