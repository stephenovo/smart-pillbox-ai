import type { HistoricalAdherenceRecord } from "./sampleHistory";
import {
  runSelfLearningReminderAI,
  type SelfLearningReminderResult,
} from "./aiAdherence";
import {
  generateCaregiverInsightReport,
  type CaregiverInsightReport,
} from "./aiCaregiverInsights";

export type CurrentReminderScenario = {
  compartmentId: number;
  currentDelayMinutes: number;
  caregiverDefinedBufferMinutes: number;
};

export type SmartPillboxAiEngineResult = {
  reminderResults: SelfLearningReminderResult[];
  caregiverInsightReport: CaregiverInsightReport;
};

export function runSmartPillboxAiEngine(params: {
  records: HistoricalAdherenceRecord[];
  currentReminderScenarios: CurrentReminderScenario[];
  patientId?: string;
}): SmartPillboxAiEngineResult {
  const { records, currentReminderScenarios, patientId = "patient-001" } = params;

  const reminderResults = currentReminderScenarios
    .map((scenario) =>
      runSelfLearningReminderAI(
        records,
        scenario.compartmentId,
        scenario.caregiverDefinedBufferMinutes,
        scenario.currentDelayMinutes
      )
    )
    .filter(
      (result): result is SelfLearningReminderResult => result !== null
    );

  const caregiverInsightReport = generateCaregiverInsightReport(
    records,
    patientId
  );

  return {
    reminderResults,
    caregiverInsightReport,
  };
}