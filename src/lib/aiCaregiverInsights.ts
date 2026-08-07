import type { HistoricalAdherenceRecord } from "./sampleHistory";

export type InsightTrendDirection =
  | "improving"
  | "stable"
  | "worsening"
  | "insufficient_data";

export type CaregiverConcernLevel = "low" | "medium" | "high";

export type MedicationInsight = {
  compartmentId: number;
  medicationName: string;
  highRisk: boolean;
  totalRecords: number;
  takenOnTimeCount: number;
  delayedCount: number;
  missedCount: number;
  duplicateOpeningCount: number;
  longTermMedianDelayMinutes: number | null;
  recentMedianDelayMinutes: number | null;
  trendDirection: InsightTrendDirection;
  concernLevel: CaregiverConcernLevel;
  concernScore: number;
  insight: string;
};

export type CaregiverInsightReport = {
  patientId: string;
  generatedAt: string;
  totalRecordsAnalysed: number;
  totalMissedCount: number;
  totalDelayedCount: number;
  totalDuplicateOpeningCount: number;
  highRiskConcernCount: number;
  overallConcernLevel: CaregiverConcernLevel;
  mostConcerningMedication: MedicationInsight | null;
  medicationInsights: MedicationInsight[];
  caregiverSummary: string;
  clinicVisitSummary: string;
};

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;

  const sortedValues = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return roundToOneDecimal(
      (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    );
  }

  return roundToOneDecimal(sortedValues[middleIndex]);
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

function getDelayValues(records: HistoricalAdherenceRecord[]): number[] {
  return records
    .filter(
      (record) =>
        record.delayMinutes !== null &&
        (record.ruleBasedStatus === "taken_on_time" ||
          record.ruleBasedStatus === "taken_delayed")
    )
    .map((record) => record.delayMinutes as number);
}

function classifyInsightTrend(
  longTermMedianDelayMinutes: number | null,
  recentMedianDelayMinutes: number | null,
  meaningfulChangeMinutes = 10
): InsightTrendDirection {
  if (
    longTermMedianDelayMinutes === null ||
    recentMedianDelayMinutes === null
  ) {
    return "insufficient_data";
  }

  const change = recentMedianDelayMinutes - longTermMedianDelayMinutes;

  if (change >= meaningfulChangeMinutes) {
    return "worsening";
  }

  if (change <= -meaningfulChangeMinutes) {
    return "improving";
  }

  return "stable";
}

function classifyConcernLevel(score: number): CaregiverConcernLevel {
  if (score >= 7) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function generateMedicationInsightText(params: {
  medicationName: string;
  highRisk: boolean;
  delayedCount: number;
  missedCount: number;
  duplicateOpeningCount: number;
  trendDirection: InsightTrendDirection;
}): string {
  const {
    medicationName,
    highRisk,
    delayedCount,
    missedCount,
    duplicateOpeningCount,
    trendDirection,
  } = params;

  if (highRisk && missedCount > 0) {
    return `${medicationName} is marked for high attention, and ${missedCount} scheduled window(s) had no opening recorded.`;
  }

  if (trendDirection === "worsening") {
    return `${medicationName} shows a later-opening pattern. Recent openings occurred later than the person's longer-term pattern.`;
  }

  if (duplicateOpeningCount > 0) {
    return `${medicationName} recorded ${duplicateOpeningCount} repeat opening event(s) in the analysed history.`;
  }

  if (missedCount > 0) {
    return `${medicationName} had ${missedCount} scheduled window(s) with no opening recorded.`;
  }

  if (delayedCount > 0) {
    return `${medicationName} had ${delayedCount} opening(s) recorded after the planned reminder time.`;
  }

  return `${medicationName} shows no strong exception pattern in the recorded opening history.`;
}

export function generateMedicationInsights(
  records: HistoricalAdherenceRecord[],
  recentWindowSize = 3
): MedicationInsight[] {
  const compartmentIds = Array.from(
    new Set(records.map((record) => record.compartmentId))
  ).sort((a, b) => a - b);

  return compartmentIds.map((compartmentId) => {
    const compartmentRecords = sortRecordsByDateAscending(
      records.filter((record) => record.compartmentId === compartmentId)
    );

    const firstRecord = compartmentRecords[0];

    const takenOnTimeCount = compartmentRecords.filter(
      (record) => record.ruleBasedStatus === "taken_on_time"
    ).length;

    const delayedCount = compartmentRecords.filter(
      (record) => record.ruleBasedStatus === "taken_delayed"
    ).length;

    const missedCount = compartmentRecords.filter(
      (record) => record.ruleBasedStatus === "missed"
    ).length;

    const duplicateOpeningCount = compartmentRecords.filter(
      (record) => record.ruleBasedStatus === "duplicate_opening"
    ).length;

    const longTermDelayValues = getDelayValues(compartmentRecords);
    const recentDelayValues = getDelayValues(
      compartmentRecords.slice(-recentWindowSize)
    );

    const longTermMedianDelayMinutes = calculateMedian(longTermDelayValues);
    const recentMedianDelayMinutes =
      recentDelayValues.length >= 2 ? calculateMedian(recentDelayValues) : null;

    const trendDirection = classifyInsightTrend(
      longTermMedianDelayMinutes,
      recentMedianDelayMinutes
    );

    let concernScore = 0;

    concernScore += missedCount * 3;
    concernScore += delayedCount * 1;
    concernScore += duplicateOpeningCount * 2;

    if (firstRecord.highRisk && missedCount > 0) {
      concernScore += 4;
    }

    if (firstRecord.highRisk && delayedCount > 0) {
      concernScore += 2;
    }

    if (trendDirection === "worsening") {
      concernScore += 3;
    }

    if (trendDirection === "improving") {
      concernScore -= 1;
    }

    concernScore = Math.max(0, concernScore);

    const concernLevel = classifyConcernLevel(concernScore);

    const insight = generateMedicationInsightText({
      medicationName: firstRecord.medicationName,
      highRisk: firstRecord.highRisk,
      delayedCount,
      missedCount,
      duplicateOpeningCount,
      trendDirection,
    });

    return {
      compartmentId,
      medicationName: firstRecord.medicationName,
      highRisk: firstRecord.highRisk,
      totalRecords: compartmentRecords.length,
      takenOnTimeCount,
      delayedCount,
      missedCount,
      duplicateOpeningCount,
      longTermMedianDelayMinutes,
      recentMedianDelayMinutes,
      trendDirection,
      concernLevel,
      concernScore,
      insight,
    };
  });
}

export function generateCaregiverInsightReport(
  records: HistoricalAdherenceRecord[],
  patientId = "patient-001"
): CaregiverInsightReport {
  const medicationInsights = generateMedicationInsights(records);

  const totalMissedCount = records.filter(
    (record) => record.ruleBasedStatus === "missed"
  ).length;

  const totalDelayedCount = records.filter(
    (record) => record.ruleBasedStatus === "taken_delayed"
  ).length;

  const totalDuplicateOpeningCount = records.filter(
    (record) => record.ruleBasedStatus === "duplicate_opening"
  ).length;

  const highRiskConcernCount = medicationInsights.filter(
    (insight) => insight.highRisk && insight.concernLevel !== "low"
  ).length;

  const mostConcerningMedication =
    medicationInsights.length > 0
      ? [...medicationInsights].sort(
          (a, b) => b.concernScore - a.concernScore
        )[0]
      : null;

  const totalConcernScore = medicationInsights.reduce(
    (sum, insight) => sum + insight.concernScore,
    0
  );

  const overallConcernLevel = classifyConcernLevel(totalConcernScore);

  const caregiverSummary =
    mostConcerningMedication === null
      ? "No adherence history is available for AI insight generation."
      : overallConcernLevel === "high"
      ? `${mostConcerningMedication.medicationName} has the highest activity-exception score, based on windows without an opening, later openings, repeat openings, or a changing timing pattern.`
      : overallConcernLevel === "medium"
      ? `${mostConcerningMedication.medicationName} has some activity exceptions in the analysed opening history.`
      : "The analysed pillbox opening history shows no strong exception pattern.";

  const clinicVisitSummary =
    mostConcerningMedication === null
      ? "No clinic summary can be generated because there is no adherence history."
      : `The analysed history contains ${totalMissedCount} scheduled window(s) without an opening, ${totalDelayedCount} later opening(s), and ${totalDuplicateOpeningCount} repeat opening event(s). ${mostConcerningMedication.medicationName} has the highest activity-exception score.`;

  return {
    patientId,
    generatedAt: new Date().toISOString(),
    totalRecordsAnalysed: records.length,
    totalMissedCount,
    totalDelayedCount,
    totalDuplicateOpeningCount,
    highRiskConcernCount,
    overallConcernLevel,
    mostConcerningMedication,
    medicationInsights,
    caregiverSummary,
    clinicVisitSummary,
  };
}

export function buildCaregiverInsightApiPrompt(
  report: CaregiverInsightReport
): string {
  return `
You are helping generate a family-friendly AI insight about recorded pillbox activity.

Important safety boundary:
- Only describe observations and patterns in compartment openings and timing.
- Do not claim that an opening means medicine was taken or swallowed.
- Do not diagnose, assess clinical safety, or recommend any action.
- Do not decide or suggest medication schedule, dosage, prescription, or routine changes.

Structured adherence report:
${JSON.stringify(report, null, 2)}
`;
}
