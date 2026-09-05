import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Layers,
  Clock,
  Calendar,
} from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { advisorService } from '../../services/advisorService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';
import { AIAdvisorResponse, AIRecommendation, SimulationResult } from '../../types/domain.js';
import { ResilienceSolution } from '../../types/solution.js';

interface AIAdvisorCardProps {
  locationId: string | undefined;
  targetYear: number;
  scenario?: string;
  simulationResult: SimulationResult | null;
  resilienceSolutions?: ResilienceSolution[];
  solutionsLoading?: boolean;
  solutionsError?: string | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-400',
  Critical: 'bg-red-500/20 text-red-400',
  High: 'bg-red-500/20 text-red-400',
  MEDIUM: 'bg-amber-500/20 text-amber-400',
  Moderate: 'bg-amber-500/20 text-amber-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  LOW: 'bg-blue-500/20 text-blue-400',
  Low: 'bg-blue-500/20 text-blue-400',
};

const RISK_TAG_STYLES: Record<string, string> = {
  HEAT: 'bg-orange-500/10 text-orange-400',
  FLOOD: 'bg-blue-500/10 text-blue-400',
  AIR_QUALITY: 'bg-purple-500/10 text-purple-400',
  WATER: 'bg-cyan-500/10 text-cyan-400',
  EMISSIONS: 'bg-slate-500/10 text-slate-400',
};

export const AIAdvisorCard: React.FC<AIAdvisorCardProps> = ({
  locationId,
  targetYear,
  scenario = 'default',
  simulationResult,
  resilienceSolutions = [],
  solutionsLoading = false,
  solutionsError = null,
}) => {
  const [response, setResponse] = useState<AIAdvisorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [showDistinction, setShowDistinction] = useState<boolean>(false);

  const fetchRecommendations = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await advisorService.getRecommendations(
        locationId,
        targetYear,
        scenario,
        simulationResult?.simulationId
      );
      setResponse(data);
    } catch (err: any) {
      const message = sanitizeErrorMessage(err, 'AI recommendations could not be generated.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [locationId, targetYear, scenario, simulationResult?.simulationId]);

  // Render: No location selected
  if (!locationId) {
    return (
      <Card className="flex flex-col justify-between min-h-[200px]">
        <h3 className="text-base font-title font-bold text-text-base mb-2 flex items-center gap-2">
          <Sparkles size={18} className="text-spotify-green" />
          <span>AI Advisor</span>
        </h3>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-xs text-text-silver text-center italic">
            Select a location to get AI-powered recommendations.
          </p>
        </div>
      </Card>
    );
  }

  // Render: Loading state
  if (loading) {
    return (
      <Card className="flex flex-col min-h-[200px]">
        <h3 className="text-base font-title font-bold text-text-base mb-2 flex items-center gap-2">
          <Sparkles size={18} className="text-spotify-green" />
          <span>AI Advisor</span>
        </h3>
        <div className="flex-grow flex flex-col items-center justify-center space-y-3 py-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-spotify-green/20 border-t-spotify-green" />
          </div>
          <p className="text-xs text-text-silver font-sans animate-pulse font-medium">
            Analyzing climate data and generating recommendations...
          </p>
          <p className="text-[10px] text-text-silver/60 font-sans text-center max-w-[280px]">
            Synthesizing satellite baseline observations, telemetry, and scenario projections
          </p>
        </div>
      </Card>
    );
  }

  // Render: Error state
  if (error) {
    return (
      <Card className="flex flex-col min-h-[200px]">
        <h3 className="text-base font-title font-bold text-text-base mb-2 flex items-center gap-2">
          <Sparkles size={18} className="text-spotify-green" />
          <span>AI Advisor</span>
        </h3>
        <div className="flex-grow flex flex-col items-center justify-center space-y-3 py-4">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-xs text-red-400 text-center max-w-[280px]">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchRecommendations}>
            <RefreshCw size={14} className="mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Render: Response state
  if (response) {
    const climateText = response.climateExplanation || response.summary;
    const risksList = response.mainRisks || response.keyProblems || [];
    const actionsList = response.recommendedActions || response.recommendations || [];
    const shortTerm = response.shortTermRecommendations || [];
    const longTerm = response.longTermRecommendations || [];

    return (
      <Card className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
            <Sparkles size={18} className="text-spotify-green" />
            <span>AI Advisor</span>
          </h3>
          <div className="flex items-center gap-2">
            {response.isFallback && (
              <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Deterministic Fallback
              </span>
            )}
            {response.dataContext.hasSimulationData && (
              <span className="text-[10px] text-black bg-spotify-green px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                Simulation-Aware
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-text-silver hover:text-text-base transition-colors rounded"
              aria-label={expanded ? 'Collapse recommendations' : 'Expand recommendations'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-4">
            {/* Fallback Notice Banner if applicable */}
            {response.isFallback && response.fallbackReason && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Notice: </span>
                  {response.fallbackReason}
                </div>
              </div>
            )}

            {/* 1. Plain-Language Climate Explanation */}
            <div>
              <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-spotify-green" />
                Climate Assessment
              </h4>
              <p className="text-xs text-text-silver leading-relaxed bg-mid-dark/50 p-2.5 rounded-lg border border-light-border/40">
                {climateText}
              </p>
            </div>

            {/* 2 & 3. Main Risks & Why They Matter */}
            {risksList.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Primary Climate Risks
                </h4>
                <ul className="space-y-1.5 mb-2.5">
                  {risksList.map((risk, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-text-silver"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>

                {response.riskSignificance && (
                  <div className="text-[11px] text-text-silver/90 bg-mid-dark/40 border-l-2 border-red-400/80 pl-3 py-1.5 rounded-r">
                    <span className="font-bold text-text-base block mb-0.5">Why This Matters:</span>
                    {response.riskSignificance}
                  </div>
                )}
              </div>
            )}

            {/* 4. Actionable Recommended Interventions */}
            {actionsList.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-spotify-green" />
                  Recommended Interventions
                </h4>
                <div className="space-y-3">
                  {actionsList.map((rec: AIRecommendation, i: number) => (
                    <div
                      key={i}
                      className="bg-mid-dark rounded-lg p-3 space-y-2 border border-light-border/30 hover:border-light-border/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-text-base">
                          {rec.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.MEDIUM
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-silver leading-relaxed">
                        {rec.reason}
                      </p>

                      {rec.expectedImpact && (
                        <div className="text-[10px] text-text-silver/80 bg-black/20 px-2 py-1 rounded">
                          <span className="font-semibold text-text-base">Expected Impact: </span>
                          {rec.expectedImpact}
                        </div>
                      )}

                      {rec.targetRisks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rec.targetRisks.map((risk, ri) => (
                            <span
                              key={ri}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                RISK_TAG_STYLES[risk] || 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              {risk.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {rec.nextStep && (
                        <div className="flex items-center gap-1.5 text-[11px] text-spotify-green pt-0.5">
                          <ArrowRight size={12} className="shrink-0" />
                          <span>{rec.nextStep}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5 & 6. Short-Term vs Long-Term Action Roadmap */}
            {(shortTerm.length > 0 || longTerm.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {shortTerm.length > 0 && (
                  <div className="bg-mid-dark/40 rounded-lg p-2.5 border border-light-border/30">
                    <h5 className="text-[10px] font-bold text-text-base uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-400" />
                      Short-Term (1-2 Years)
                    </h5>
                    <ul className="space-y-1.5">
                      {shortTerm.map((st, i) => (
                        <li key={i} className="text-[11px] text-text-silver flex items-start gap-1.5">
                          <span className="text-[9px] font-bold text-amber-400/90 mt-0.5">▪</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {longTerm.length > 0 && (
                  <div className="bg-mid-dark/40 rounded-lg p-2.5 border border-light-border/30">
                    <h5 className="text-[10px] font-bold text-text-base uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar size={12} className="text-spotify-green" />
                      Long-Term (5-25 Years)
                    </h5>
                    <ul className="space-y-1.5">
                      {longTerm.map((lt, i) => (
                        <li key={i} className="text-[11px] text-text-silver flex items-start gap-1.5">
                          <span className="text-[9px] font-bold text-spotify-green/90 mt-0.5">▪</span>
                          <span>{lt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 7. Confidence & Scientific Limitations Statement */}
            {response.confidenceLimitations && (
              <div className="bg-mid-dark/30 border border-light-border/40 rounded-lg p-2.5 flex items-start gap-2">
                <ShieldCheck size={14} className="text-spotify-green shrink-0 mt-0.5" />
                <div className="text-[10px] text-text-silver/90 leading-relaxed">
                  <span className="font-bold text-text-base block mb-0.5">Scientific Confidence & Limitations:</span>
                  {response.confidenceLimitations}
                </div>
              </div>
            )}

            {/* Data Distinction Breakdown (Toggleable) */}
            {response.dataDistinction && (
              <div className="border-t border-light-border/40 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDistinction(!showDistinction)}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-text-silver/80 hover:text-text-base transition-colors"
                >
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Layers size={12} className="text-spotify-green" />
                    Data Distinction & Provenance Breakdown
                  </span>
                  {showDistinction ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showDistinction && (
                  <div className="mt-2.5 space-y-2 text-[10px] bg-mid-dark/30 p-2.5 rounded border border-light-border/30">
                    <div>
                      <span className="font-bold text-spotify-green block">1. Supplied Data (Observed):</span>
                      <ul className="list-disc list-inside text-text-silver pl-1 space-y-0.5">
                        {response.dataDistinction.suppliedData.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-cyan-400 block">2. Calculated Values (Statistical / Modeling):</span>
                      <ul className="list-disc list-inside text-text-silver pl-1 space-y-0.5">
                        {response.dataDistinction.calculatedValues.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-amber-400 block">3. Scenario Assumptions:</span>
                      <ul className="list-disc list-inside text-text-silver pl-1 space-y-0.5">
                        {response.dataDistinction.assumptions.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-text-base block">4. Action Recommendations:</span>
                      <ul className="list-disc list-inside text-text-silver pl-1 space-y-0.5">
                        {response.dataDistinction.recommendations.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer: Model Attribution + Refresh */}
            <div className="flex items-center justify-between pt-2 border-t border-light-border">
              <span className="text-[10px] text-text-silver/60">
                Engine: {response.model.provider} {response.model.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecommendations}
                className="text-[10px] py-1 px-3"
              >
                <RefreshCw size={12} className="mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Render: Default state (ready to generate)
  return (
    <Card className="flex flex-col justify-between min-h-[200px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
            <Sparkles size={18} className="text-spotify-green" />
            <span>AI Advisor</span>
          </h3>
          {resilienceSolutions.length > 0 && (
            <span className="text-[10px] text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-2 py-0.5 rounded-full font-bold">
              {resilienceSolutions.length} Solutions
            </span>
          )}
        </div>

        {solutionsLoading ? (
          <div className="py-4 text-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-spotify-green/20 border-t-spotify-green mx-auto mb-1.5" />
            <span className="text-xs text-text-silver font-sans">Evaluating resilience solutions...</span>
          </div>
        ) : resilienceSolutions.length > 0 ? (
          <div className="space-y-2 mb-3">
            <span className="text-[10px] font-bold text-text-silver uppercase tracking-wider block">
              Prioritized Resilience Actions
            </span>
            <div className="space-y-1.5">
              {resilienceSolutions.slice(0, 2).map((sol) => (
                <div
                  key={sol.id}
                  className="bg-mid-dark/60 p-2 rounded border border-border-gray/30 text-left space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-text-base truncate">
                      {sol.title}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        PRIORITY_STYLES[sol.priority] || PRIORITY_STYLES.MEDIUM
                      }`}
                    >
                      {sol.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-silver leading-snug line-clamp-2">
                    {sol.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : solutionsError ? (
          <p className="text-xs text-text-silver italic text-center py-2">
            {solutionsError}
          </p>
        ) : (
          <p className="text-xs text-text-silver leading-relaxed py-2">
            {simulationResult
              ? 'Simulation complete. Generate AI-powered strategic analysis based on verified climate data.'
              : 'Generate AI-powered climate risk analysis and actionable recommendations for this location.'}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-border-gray/40 flex justify-center">
        <Button
          variant="primary"
          size="sm"
          onClick={fetchRecommendations}
          className="w-full flex items-center justify-center gap-1.5"
        >
          <Sparkles size={14} />
          <span>{resilienceSolutions.length > 0 ? 'Generate AI Strategic Analysis' : 'Get AI Recommendations'}</span>
        </Button>
      </div>
    </Card>
  );
};
