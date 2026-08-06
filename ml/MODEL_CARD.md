# Adherence Shadow Model Card

## Status

- Deployment status: **Shadow only**
- Production model: **None**
- Data source: **Synthetic**
- Automatic model promotion: **Disabled**
- Clinical or diagnostic use: **Prohibited**

## Intended use

The model ranks the probability that an upcoming dose may need additional
support. It is an input to a conservative adaptive-reminder policy and an
offline learning workflow. It does not send reminders by itself.

The behaviour-change model may surface a sustained routine change for review.
It must not be described as detecting memory loss, cognitive decline, or any
medical condition.

## Inputs

Fifteen pre-dose features describe schedule context, device availability, and
historical opening behaviour. Every feature must be available before the
current dose. Current-dose outcomes and synthetic labels are forbidden inputs.

## Outcome contract

Lifecycle labels describe observed lid activity, not medication ingestion.
`no_open_by_buffer` and `observed_very_late` may be exported as an observable
adherence proxy, but they are not automatically converted into the model's
`needs_support` target. Real retraining requires an explicit reviewed target.

## Safety boundary

- High-risk Safety Control is deterministic and independent of the model.
- The model cannot suppress Safety Control.
- Adaptive recommendations are limited to one per patient day with a six-hour
  cooldown.
- Model or model-service failure cannot reject a hardware event or heartbeat.

## Evaluation

The repository includes patient-held-out training evaluation, temporal
champion/candidate backtesting, reminder-budget replay, and perturbation stress
tests. All current metrics measure synthetic pipeline behaviour only.

## Known limitations

- Synthetic distributions may not resemble real routines, devices, medicines,
  care environments, or subgroups.
- Extreme worsening features produce highly saturated probabilities and require
  real-data calibration.
- Opening a lid does not prove that the correct medication was ingested.
- Reminder benefit and alert fatigue require prospective real-user evidence.
- Patient timezone, durable storage, access control, auditing, and a protected
  production scheduler are not yet implemented.

## Promotion policy

A candidate may become `eligible_for_extended_shadow` after automated gates,
but it remains unpromoted. Promotion requires human review, real-data
calibration, subgroup evaluation, and a documented rollback decision.
