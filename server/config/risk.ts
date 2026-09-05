export interface RiskThresholds {
  heat: {
    minTemp: number;
    maxTemp: number;
  };
  flood: {
    minPrecip: number;
    maxPrecip: number;
  };
}

export const RISK_THRESHOLDS: RiskThresholds = {
  heat: {
    minTemp: 15.0, // °C - baseline low temperature (VERY LOW risk)
    maxTemp: 45.0, // °C - high heat index threshold (VERY HIGH risk)
  },
  flood: {
    minPrecip: 0.5, // mm/day - dry baseline (VERY LOW risk)
    maxPrecip: 8.0, // mm/day - high average precipitation rate (VERY HIGH risk)
  },
};

export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * Map a normalized score [0, 1] to a discrete risk level
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score < 0.2) return 'VERY_LOW';
  if (score < 0.4) return 'LOW';
  if (score < 0.6) return 'MEDIUM';
  if (score < 0.8) return 'HIGH';
  return 'VERY_HIGH';
}
