export type ResilienceSolutionCategory =
  | 'Water management'
  | 'Flood protection'
  | 'Heat mitigation'
  | 'Agriculture'
  | 'Infrastructure'
  | 'Energy'
  | 'Emergency preparedness';

export type SolutionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type ImplementationDifficulty = 'Low' | 'Moderate' | 'High' | 'Complex';

export type SolutionStatus = 'Active' | 'Planned' | 'Proposed';

export interface ResilienceSolution {
  id: string;
  title: string;
  category: ResilienceSolutionCategory;
  problemAddressed: string;
  recommendedAction: string;
  expectedBenefit: string;
  priority: SolutionPriority;
  implementationDifficulty: ImplementationDifficulty;
  relevantRisk: string;
  status: SolutionStatus;
  progress: number;
  timeHorizon: 'Immediate (0-2 years)' | 'Medium-term (2-5 years)' | 'Strategic (5-15 years)';
  iconName: string;
}

export interface ResilienceRisksSummary {
  heat: {
    level: string;
    score: number | null;
    extremeDays?: number;
  };
  flood: {
    level: string;
    score: number | null;
    projectedPrecip?: number;
  };
  drought: {
    level: string;
    score: number | null;
    soilMoisture?: number;
  };
  airQuality: {
    aqi: number;
    level: string;
  };
  composite: {
    level: string;
    score: number | null;
    primaryDriver: string;
  };
}

export interface ResilienceAiExplanation {
  executiveSummary: string;
  strategicRoadmap: string[];
  policyRecommendation: string;
  provenance: string;
  isFallback: boolean;
  fallbackReason?: string;
}

export interface ResilienceSolutionsResponse {
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  targetYear: number;
  scenario: {
    id: string;
    name: string;
    tag: string;
    description: string;
  };
  risks: ResilienceRisksSummary;
  solutions: ResilienceSolution[];
  aiExplanation?: ResilienceAiExplanation;
}
