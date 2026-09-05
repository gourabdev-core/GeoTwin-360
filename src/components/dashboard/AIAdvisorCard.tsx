import React, { useState, useCallback } from 'react';
import { Sparkles, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { advisorService } from '../../services/advisorService.js';
import { AIAdvisorResponse, AIRecommendation, SimulationResult } from '../../types/domain.js';

interface AIAdvisorCardProps {
  locationId: string | undefined;
  targetYear: number;
  simulationResult: SimulationResult | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-400',
  MEDIUM: 'bg-amber-500/20 text-amber-400',
  LOW: 'bg-blue-500/20 text-blue-400',
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
  simulationResult,
}) => {
  const [response, setResponse] = useState<AIAdvisorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(true);

  const fetchRecommendations = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await advisorService.getRecommendations(
        locationId,
        targetYear,
        simulationResult?.simulationId
      );
      setResponse(data);
    } catch (err: any) {
      const message = err.message || 'AI recommendations could not be generated.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [locationId, targetYear, simulationResult?.simulationId]);

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
        <div className="flex-grow flex flex-col items-center justify-center space-y-3 py-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-spotify-green/20 border-t-spotify-green" />
          </div>
          <p className="text-xs text-text-silver font-sans animate-pulse">
            Analyzing climate data and generating recommendations...
          </p>
          <p className="text-[10px] text-text-silver/60 font-sans">
            This may take a few seconds
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
    return (
      <Card className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
            <Sparkles size={18} className="text-spotify-green" />
            <span>AI Advisor</span>
          </h3>
          <div className="flex items-center gap-2">
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
            {/* Summary */}
            <p className="text-xs text-text-silver leading-relaxed">
              {response.summary}
            </p>

            {/* Key Problems */}
            {response.keyProblems.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-2">
                  Key Problems
                </h4>
                <ul className="space-y-1.5">
                  {response.keyProblems.map((problem, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-text-silver"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      {problem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {response.recommendations.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-2">
                  Recommendations
                </h4>
                <div className="space-y-3">
                  {response.recommendations.map((rec: AIRecommendation, i: number) => (
                    <div
                      key={i}
                      className="bg-mid-dark rounded-lg p-3 space-y-2"
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
                        <div className="flex items-center gap-1.5 text-[11px] text-spotify-green">
                          <ArrowRight size={12} />
                          <span>{rec.nextStep}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Intervention Priorities */}
            {response.interventionPriorities.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-text-base uppercase tracking-wider mb-2">
                  Intervention Priorities
                </h4>
                <ol className="space-y-1">
                  {response.interventionPriorities.map((priority, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs text-text-silver"
                    >
                      <span className="text-[10px] font-bold text-spotify-green w-4 text-right">
                        {i + 1}.
                      </span>
                      {priority}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Footer: Model Attribution + Refresh */}
            <div className="flex items-center justify-between pt-2 border-t border-light-border">
              <span className="text-[10px] text-text-silver/60">
                Powered by {response.model.provider} {response.model.name}
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
      <h3 className="text-base font-title font-bold text-text-base mb-2 flex items-center gap-2">
        <Sparkles size={18} className="text-spotify-green" />
        <span>AI Advisor</span>
      </h3>
      <div className="flex-grow flex flex-col items-center justify-center space-y-3 py-4">
        <p className="text-xs text-text-silver text-center max-w-[260px]">
          {simulationResult
            ? 'Simulation complete. Get AI-powered analysis and recommendations based on verified climate data.'
            : 'Get AI-powered climate risk analysis and actionable recommendations for this location.'}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={fetchRecommendations}
        >
          Get AI Recommendations
        </Button>
      </div>
    </Card>
  );
};
