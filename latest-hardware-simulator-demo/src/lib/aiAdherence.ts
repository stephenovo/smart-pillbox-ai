import type { HistoricalAdherenceRecord } from "./sampleHistory";

export type DelayConsistency = "fast" | "slow" | "inconsistent";

export type DelayProfile = {
  compartmentId: number;
  medicationName: string;
  highRisk: boolean;
  recordCount: number;
  averageDelayMinutes: number;
  medianDelayMinutes: number;
  standardDeviationMinutes: number;
  normalDelayMinMinutes: number;
  normalDelayMaxMinutes: number;
  consistency: DelayConsistency;
  hasEnoughHistory: boolean;
};

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const average = calculateAverage(values);
  const squaredDifferences = values.map((value) => (value - average) ** 2);
  const variance = calculateAverage(squaredDifferences);

  return Math.sqrt(variance);
}

function classifyDelayConsistency(
  medianDelayMinutes: number,
  standardDeviationMinutes: number
): DelayConsistency {
  if (standardDeviationMinutes <= 7 && medianDelayMinutes <= 15) {
    return "fast";
  }

  if (standardDeviationMinutes <= 10 && medianDelayMinutes > 20) {
    return "slow";
  }

  return "inconsistent";
}

export function calculateDelayProfile(
  records: HistoricalAdherenceRecord[],
  compartmentId: number,
  minimumHistoryCount = 3
): DelayProfile | null {
  const compartmentRecords = records.filter(
    (record) => record.compartmentId === compartmentId
  );

  if (compartmentRecords.length === 0) {
    return null;
  }

  const validDelayRecords = compartmentRecords.filter(
    (record) =>
      record.delayMinutes !== null &&
      (record.ruleBasedStatus === "taken_on_time" ||
        record.ruleBasedStatus === "taken_delayed")
  );

  const delayValues = validDelayRecords.map((record) => record.delayMinutes as number);

  const firstRecord = compartmentRecords[0];
  const recordCount = delayValues.length;
  const hasEnoughHistory = recordCount >= minimumHistoryCount;

  if (recordCount === 0) {
    return {
      compartmentId,
      medicationName: firstRecord.medicationName,
      highRisk: firstRecord.highRisk,
      recordCount,
      averageDelayMinutes: 0,
      medianDelayMinutes: 0,
      standardDeviationMinutes: 0,
      normalDelayMinMinutes: 0,
      normalDelayMaxMinutes: 0,
      consistency: "inconsistent",
      hasEnoughHistory: false,
    };
  }

  const averageDelayMinutes = calculateAverage(delayValues);
  const medianDelayMinutes = calculateMedian(delayValues);
  const standardDeviationMinutes = calculateStandardDeviation(delayValues);

  const normalDelayMinMinutes = Math.max(
    0,
    medianDelayMinutes - standardDeviationMinutes
  );
  const normalDelayMaxMinutes = medianDelayMinutes + standardDeviationMinutes;

  return {
    compartmentId,
    medicationName: firstRecord.medicationName,
    highRisk: firstRecord.highRisk,
    recordCount,
    averageDelayMinutes: roundToOneDecimal(averageDelayMinutes),
    medianDelayMinutes: roundToOneDecimal(medianDelayMinutes),
    standardDeviationMinutes: roundToOneDecimal(standardDeviationMinutes),
    normalDelayMinMinutes: roundToOneDecimal(normalDelayMinMinutes),
    normalDelayMaxMinutes: roundToOneDecimal(normalDelayMaxMinutes),
    consistency: classifyDelayConsistency(
      medianDelayMinutes,
      standardDeviationMinutes
    ),
    hasEnoughHistory,
  };
}

export function calculateAllDelayProfiles(
  records: HistoricalAdherenceRecord[]
): DelayProfile[] {
  const compartmentIds = Array.from(
    new Set(records.map((record) => record.compartmentId))
  ).sort((a, b) => a - b);

  return compartmentIds
    .map((compartmentId) => calculateDelayProfile(records, compartmentId))
    .filter((profile): profile is DelayProfile => profile !== null);
}

export type EscalationThreshold = {
  compartmentId: number;
  medicationName: string;
  highRisk: boolean;
  caregiverDefinedBufferMinutes: number;
  safetyMarginMinutes: number;
  historicalMedianDelayMinutes: number;
  personalisedThresholdMinutes: number;
  isPersonalised: boolean;
  explanation: string;
};

function getSafetyMarginMinutes(highRisk: boolean): number {
  return highRisk ? 10 : 15;
}

export function calculatePersonalisedEscalationThreshold(
  delayProfile: DelayProfile,
  caregiverDefinedBufferMinutes: number
): EscalationThreshold {
  const safetyMarginMinutes = getSafetyMarginMinutes(delayProfile.highRisk);

  if (!delayProfile.hasEnoughHistory) {
    return {
      compartmentId: delayProfile.compartmentId,
      medicationName: delayProfile.medicationName,
      highRisk: delayProfile.highRisk,
      caregiverDefinedBufferMinutes,
      safetyMarginMinutes,
      historicalMedianDelayMinutes: delayProfile.medianDelayMinutes,
      personalisedThresholdMinutes: caregiverDefinedBufferMinutes,
      isPersonalised: false,
      explanation:
        "Insufficient history. The system uses the caregiver-defined buffer time instead of a personalised threshold.",
    };
  }

  const rawPersonalisedThreshold =
    delayProfile.medianDelayMinutes + safetyMarginMinutes;

  const personalisedThresholdMinutes = Math.min(
    rawPersonalisedThreshold,
    caregiverDefinedBufferMinutes
  );

  const explanation = delayProfile.highRisk
    ? "High-risk medication detected. A smaller safety margin is applied, and the threshold is capped by the caregiver-defined buffer time."
    : "The threshold is personalised based on the user's historical median response delay, with a safety margin, and capped by the caregiver-defined buffer time.";

  return {
    compartmentId: delayProfile.compartmentId,
    medicationName: delayProfile.medicationName,
    highRisk: delayProfile.highRisk,
    caregiverDefinedBufferMinutes,
    safetyMarginMinutes,
    historicalMedianDelayMinutes: delayProfile.medianDelayMinutes,
    personalisedThresholdMinutes,
    isPersonalised: true,
    explanation,
  };
}

export function calculateAllPersonalisedEscalationThresholds(
  delayProfiles: DelayProfile[],
  caregiverBufferByCompartment: Record<number, number>
): EscalationThreshold[] {
  return delayProfiles.map((profile) => {
    const caregiverDefinedBufferMinutes =
      caregiverBufferByCompartment[profile.compartmentId] ?? 60;

    return calculatePersonalisedEscalationThreshold(
      profile,
      caregiverDefinedBufferMinutes
    );
  });
}

export type AiReminderRecommendationType =
  | "continue_local_reminder"
  | "second_reminder_recommended"
  | "caregiver_alert_recommended"
  | "high_risk_escalation_recommended"
  | "insufficient_history";

export type AiUrgencyLevel = "low" | "medium" | "high";

export type AiReminderRecommendation = {
  compartmentId: number;
  medicationName: string;
  highRisk: boolean;
  currentDelayMinutes: number;
  recommendation: AiReminderRecommendationType;
  urgencyLevel: AiUrgencyLevel;
  personalisedThresholdMinutes: number;
  caregiverDefinedBufferMinutes: number;
  explanation: string;
};

export function generateAiReminderRecommendation(
  delayProfile: DelayProfile,
  escalationThreshold: EscalationThreshold,
  currentDelayMinutes: number
): AiReminderRecommendation {
  if (!delayProfile.hasEnoughHistory || !escalationThreshold.isPersonalised) {
    return {
      compartmentId: delayProfile.compartmentId,
      medicationName: delayProfile.medicationName,
      highRisk: delayProfile.highRisk,
      currentDelayMinutes,
      recommendation: "insufficient_history",
      urgencyLevel: "low",
      personalisedThresholdMinutes:
        escalationThreshold.personalisedThresholdMinutes,
      caregiverDefinedBufferMinutes:
        escalationThreshold.caregiverDefinedBufferMinutes,
      explanation:
        "There is not enough historical adherence data for this medication. The AI will not personalise escalation yet.",
    };
  }

  if (
    delayProfile.highRisk &&
    currentDelayMinutes >= escalationThreshold.personalisedThresholdMinutes
  ) {
    return {
      compartmentId: delayProfile.compartmentId,
      medicationName: delayProfile.medicationName,
      highRisk: delayProfile.highRisk,
      currentDelayMinutes,
      recommendation: "high_risk_escalation_recommended",
      urgencyLevel: "high",
      personalisedThresholdMinutes:
        escalationThreshold.personalisedThresholdMinutes,
      caregiverDefinedBufferMinutes:
        escalationThreshold.caregiverDefinedBufferMinutes,
      explanation:
        "This is a high-risk medication, and the current delay has exceeded the personalised escalation threshold. Caregiver attention is recommended.",
    };
  }

  if (currentDelayMinutes >= escalationThreshold.personalisedThresholdMinutes) {
    return {
      compartmentId: delayProfile.compartmentId,
      medicationName: delayProfile.medicationName,
      highRisk: delayProfile.highRisk,
      currentDelayMinutes,
      recommendation: "caregiver_alert_recommended",
      urgencyLevel: "high",
      personalisedThresholdMinutes:
        escalationThreshold.personalisedThresholdMinutes,
      caregiverDefinedBufferMinutes:
        escalationThreshold.caregiverDefinedBufferMinutes,
      explanation:
        "The current delay is longer than this user's usual response pattern. Caregiver alert is recommended.",
    };
  }

  const secondReminderThreshold =
    escalationThreshold.personalisedThresholdMinutes * 0.7;

  if (currentDelayMinutes >= secondReminderThreshold) {
    return {
      compartmentId: delayProfile.compartmentId,
      medicationName: delayProfile.medicationName,
      highRisk: delayProfile.highRisk,
      currentDelayMinutes,
      recommendation: "second_reminder_recommended",
      urgencyLevel: "medium",
      personalisedThresholdMinutes:
        escalationThreshold.personalisedThresholdMinutes,
      caregiverDefinedBufferMinutes:
        escalationThreshold.caregiverDefinedBufferMinutes,
      explanation:
        "The current delay is approaching the personalised escalation threshold. A second local reminder is recommended before caregiver alert.",
    };
  }

  return {
    compartmentId: delayProfile.compartmentId,
    medicationName: delayProfile.medicationName,
    highRisk: delayProfile.highRisk,
    currentDelayMinutes,
    recommendation: "continue_local_reminder",
    urgencyLevel: "low",
    personalisedThresholdMinutes:
      escalationThreshold.personalisedThresholdMinutes,
    caregiverDefinedBufferMinutes:
      escalationThreshold.caregiverDefinedBufferMinutes,
    explanation:
      "The current delay is still within this user's normal adherence pattern. Continue local reminder without caregiver alert.",
  };
}

export type LearningTrend =
  | "improving"
  | "stable"
  | "worsening"
  | "insufficient_recent_data";

export type SelfLearningAdherenceModel = {
  compartmentId: number;
  medicationName: string;
  highRisk: boolean;
  learnedRecordCount: number;
  longTermProfile: DelayProfile;
  recentProfile: DelayProfile | null;
  longTermMedianDelayMinutes: number;
  recentMedianDelayMinutes: number | null;
  trendChangeMinutes: number | null;
  learningTrend: LearningTrend;
  modelVersion: string;
  explanation: string;
};

export type AdaptiveEscalationThreshold = EscalationThreshold & {
  learningTrend: LearningTrend;
  recentMedianDelayMinutes: number | null;
  trendChangeMinutes: number | null;
  modelVersion: string;
};

function isLearnableTakenRecord(record: HistoricalAdherenceRecord): boolean {
  return (
    record.delayMinutes !== null &&
    (record.ruleBasedStatus === "taken_on_time" ||
      record.ruleBasedStatus === "taken_delayed")
  );
}

function sortRecordsByDateAscending(
  records: HistoricalAdherenceRecord[]
): HistoricalAdherenceRecord[] {
  return [...records].sort((a, b) => {
    const aKey = `${a.date}-${a.id}`;
    const bKey = `${b.date}-${b.id}`;
    return aKey.localeCompare(bKey);
  });
}

function classifyLearningTrend(
  trendChangeMinutes: number | null,
  minimumMeaningfulChangeMinutes = 10
): LearningTrend {
  if (trendChangeMinutes === null) {
    return "insufficient_recent_data";
  }

  if (trendChangeMinutes >= minimumMeaningfulChangeMinutes) {
    return "worsening";
  }

  if (trendChangeMinutes <= -minimumMeaningfulChangeMinutes) {
    return "improving";
  }

  return "stable";
}

export function addRecordToLearningHistory(
  existingRecords: HistoricalAdherenceRecord[],
  newRecord: HistoricalAdherenceRecord
): HistoricalAdherenceRecord[] {
  return [...existingRecords, newRecord];
}

export function calculateSelfLearningAdherenceModel(
  records: HistoricalAdherenceRecord[],
  compartmentId: number,
  recentWindowSize = 3,
  minimumRecentCount = 3
): SelfLearningAdherenceModel | null {
  const longTermProfile = calculateDelayProfile(records, compartmentId);

  if (longTermProfile === null) {
    return null;
  }

  const learnableRecords = sortRecordsByDateAscending(
    records.filter(
      (record) =>
        record.compartmentId === compartmentId && isLearnableTakenRecord(record)
    )
  );

  const recentLearnableRecords = learnableRecords.slice(-recentWindowSize);

  const recentProfile =
    recentLearnableRecords.length > 0
      ? calculateDelayProfile(
          recentLearnableRecords,
          compartmentId,
          minimumRecentCount
        )
      : null;

  const recentMedianDelayMinutes =
    recentProfile !== null && recentProfile.hasEnoughHistory
      ? recentProfile.medianDelayMinutes
      : null;

  const trendChangeMinutes =
    recentMedianDelayMinutes !== null
      ? roundToOneDecimal(
          recentMedianDelayMinutes - longTermProfile.medianDelayMinutes
        )
      : null;

  const learningTrend = classifyLearningTrend(trendChangeMinutes);

  const explanation =
    learningTrend === "worsening"
      ? "Recent adherence behaviour is becoming slower than the long-term pattern. The AI model will use a more cautious escalation threshold."
      : learningTrend === "improving"
      ? "Recent adherence behaviour is improving compared with the long-term pattern. The AI model will update the user profile while still respecting caregiver-defined safety limits."
      : learningTrend === "stable"
      ? "Recent adherence behaviour is consistent with the long-term pattern. The AI model can continue using the personalised delay profile."
      : "There is not enough recent adherence data to detect a reliable trend yet.";

  return {
    compartmentId,
    medicationName: longTermProfile.medicationName,
    highRisk: longTermProfile.highRisk,
    learnedRecordCount: learnableRecords.length,
    longTermProfile,
    recentProfile,
    longTermMedianDelayMinutes: longTermProfile.medianDelayMinutes,
    recentMedianDelayMinutes,
    trendChangeMinutes,
    learningTrend,
    modelVersion: `self-learning-v1-c${compartmentId}-r${records.length}`,
    explanation,
  };
}

export function calculateSelfLearningEscalationThreshold(
  model: SelfLearningAdherenceModel,
  caregiverDefinedBufferMinutes: number
): AdaptiveEscalationThreshold {
    const safetyMarginMinutes = getSafetyMarginMinutes(model.highRisk);

    if (!model.longTermProfile.hasEnoughHistory) {
        return {
        compartmentId: model.compartmentId,
        medicationName: model.medicationName,
        highRisk: model.highRisk,
        caregiverDefinedBufferMinutes,
        safetyMarginMinutes,
        historicalMedianDelayMinutes: model.longTermMedianDelayMinutes,
        personalisedThresholdMinutes: caregiverDefinedBufferMinutes,
        isPersonalised: false,
        learningTrend: model.learningTrend,
        recentMedianDelayMinutes: model.recentMedianDelayMinutes,
        trendChangeMinutes: model.trendChangeMinutes,
        modelVersion: model.modelVersion,
        explanation:
            "Insufficient long-term history. The system uses the caregiver-defined buffer time instead of a self-learning personalised threshold.",
        };
    }

    let baselineDelayMinutes = model.longTermMedianDelayMinutes;
    let learningAdjustmentMinutes = 0;

    if (
    model.learningTrend === "worsening" &&
    model.recentMedianDelayMinutes !== null
    ) {
    // If recent behaviour is worse, the AI should not normalise the worse habit.
    // It keeps the long-term learned baseline and becomes more cautious.
    learningAdjustmentMinutes = model.highRisk ? -5 : -3;
    }

    if (
    model.learningTrend === "improving" &&
    !model.highRisk &&
    model.recentMedianDelayMinutes !== null
    ) {
    // For normal-risk medication, improving behaviour can update the profile gradually.
    // High-risk medication stays more conservative.
    baselineDelayMinutes =
        (model.longTermMedianDelayMinutes + model.recentMedianDelayMinutes) / 2;
    learningAdjustmentMinutes = 0;
    }

    const rawAdaptiveThreshold =
        baselineDelayMinutes + safetyMarginMinutes + learningAdjustmentMinutes;

    const personalisedThresholdMinutes = Math.min(
        Math.max(5, roundToOneDecimal(rawAdaptiveThreshold)),
        caregiverDefinedBufferMinutes
    );

    const explanation =
    model.learningTrend === "worsening"
        ? "The AI model detected slower recent adherence. It keeps the long-term learned baseline and applies a more cautious escalation threshold, capped by the caregiver-defined buffer time."
        : model.learningTrend === "improving"
        ? "The AI model detected improving adherence. It updates the personalised profile gradually while still keeping the threshold within caregiver-defined safety limits."
        : model.learningTrend === "stable"
        ? "The AI model detected stable adherence. It uses the learned long-term personalised delay profile, capped by the caregiver-defined buffer time."
        : "The AI model has enough long-term history but not enough recent data for trend learning. It uses the long-term personalised delay profile.";

    return {
        compartmentId: model.compartmentId,
        medicationName: model.medicationName,
        highRisk: model.highRisk,
        caregiverDefinedBufferMinutes,
        safetyMarginMinutes,
        historicalMedianDelayMinutes: model.longTermMedianDelayMinutes,
        personalisedThresholdMinutes,
        isPersonalised: true,
        learningTrend: model.learningTrend,
        recentMedianDelayMinutes: model.recentMedianDelayMinutes,
        trendChangeMinutes: model.trendChangeMinutes,
        modelVersion: model.modelVersion,
        explanation,
    };
    }

export type SelfLearningReminderRecommendation = AiReminderRecommendation & {
  learningTrend: LearningTrend;
  recentMedianDelayMinutes: number | null;
  trendChangeMinutes: number | null;
  modelVersion: string;
  learningExplanation: string;
};

export type SelfLearningReminderResult = {
  model: SelfLearningAdherenceModel;
  threshold: AdaptiveEscalationThreshold;
  recommendation: SelfLearningReminderRecommendation;
};

function getLearningTrendExplanation(model: SelfLearningAdherenceModel): string {
  if (model.learningTrend === "worsening") {
    return "Recent adherence behaviour is slower than the user's long-term pattern, so the AI applies a more cautious reminder escalation threshold.";
  }

  if (model.learningTrend === "improving") {
    return "Recent adherence behaviour is improving, so the AI gradually updates the personalised profile while still respecting caregiver-defined safety limits.";
  }

  if (model.learningTrend === "stable") {
    return "Recent adherence behaviour is stable, so the AI continues using the learned personalised delay profile.";
  }

  return "There is not enough recent data for reliable trend learning, so the AI uses the long-term learned profile only.";
}

export function generateSelfLearningReminderRecommendation(
  model: SelfLearningAdherenceModel,
  adaptiveThreshold: AdaptiveEscalationThreshold,
  currentDelayMinutes: number
): SelfLearningReminderRecommendation {
  const normalisedCurrentDelayMinutes = Math.max(
    0,
    roundToOneDecimal(currentDelayMinutes)
  );

  const baseRecommendation = generateAiReminderRecommendation(
    model.longTermProfile,
    adaptiveThreshold,
    normalisedCurrentDelayMinutes
  );

  const learningExplanation = getLearningTrendExplanation(model);

  return {
    ...baseRecommendation,
    currentDelayMinutes: normalisedCurrentDelayMinutes,
    personalisedThresholdMinutes:
      adaptiveThreshold.personalisedThresholdMinutes,
    caregiverDefinedBufferMinutes:
      adaptiveThreshold.caregiverDefinedBufferMinutes,
    learningTrend: adaptiveThreshold.learningTrend,
    recentMedianDelayMinutes: adaptiveThreshold.recentMedianDelayMinutes,
    trendChangeMinutes: adaptiveThreshold.trendChangeMinutes,
    modelVersion: adaptiveThreshold.modelVersion,
    learningExplanation,
    explanation: `${baseRecommendation.explanation} ${learningExplanation}`,
  };
}

export function runSelfLearningReminderAI(
  records: HistoricalAdherenceRecord[],
  compartmentId: number,
  caregiverDefinedBufferMinutes: number,
  currentDelayMinutes: number
): SelfLearningReminderResult | null {
  const model = calculateSelfLearningAdherenceModel(records, compartmentId);

  if (model === null) {
    return null;
  }

  const threshold = calculateSelfLearningEscalationThreshold(
    model,
    caregiverDefinedBufferMinutes
  );

  const recommendation = generateSelfLearningReminderRecommendation(
    model,
    threshold,
    currentDelayMinutes
  );

  return {
    model,
    threshold,
    recommendation,
  };
}