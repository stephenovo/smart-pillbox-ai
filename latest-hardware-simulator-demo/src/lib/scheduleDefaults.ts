export function getRecommendedBufferTime(highRisk: boolean): number {
  return highRisk ? 30 : 60;
}