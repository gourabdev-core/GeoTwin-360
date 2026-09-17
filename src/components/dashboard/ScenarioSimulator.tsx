import React, { useState, useEffect, useRef } from 'react';
import { Sliders, CheckSquare, TreePine, Sun, Droplet, Home, Bus, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { simulationService } from '../../services/simulationService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';
import { SimulationResult } from '../../types/domain.js';

interface ScenarioSimulatorProps {
  locationId: string | undefined;
  year: number;
  scenario?: string;
  onSimulationResult: (result: SimulationResult | null) => void;
}

interface InterventionItem {
  slug: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  locationId,
  year,
  scenario = 'default',
  onSimulationResult,
}) => {
  const [selectedInterventions, setSelectedInterventions] = useState<Set<string>>(new Set());
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of mounted state and request ordering
  const activeReqRef = useRef<number>(0);

  const interventions: InterventionItem[] = [
    {
      slug: 'plant-trees',
      name: 'Plant Trees',
      description: 'Increase urban canopy to reduce temperatures and absorb CO2.',
      icon: <TreePine size={16} />,
    },
    {
      slug: 'install-solar-panels',
      name: 'Install Solar Panels',
      description: 'Replace fossil-fuel energy with local renewable energy.',
      icon: <Sun size={16} />,
    },
    {
      slug: 'rainwater-harvesting',
      name: 'Rainwater Harvesting',
      description: 'Store surface runoff to replenish aquifers and mitigate floods.',
      icon: <Droplet size={16} />,
    },
    {
      slug: 'cool-roof-initiative',
      name: 'Cool Roofs',
      description: 'Reflective building coatings to lower urban heat.',
      icon: <Home size={16} />,
    },
    {
      slug: 'electric-public-transport',
      name: 'Electric/Public Transport',
      description: 'Electrify bus fleets to improve air quality.',
      icon: <Bus size={16} />,
    },
  ];

  // Re-run simulation function
  const runSimulationForParams = async (
    targetLocId: string,
    targetYr: number,
    targetScen: string,
    activeInterventions: string[]
  ) => {
    activeReqRef.current++;
    const currentReq = activeReqRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await simulationService.runSimulation(
        targetLocId,
        targetYr,
        activeInterventions,
        targetScen
      );
      if (currentReq === activeReqRef.current) {
        setSimulationResult(result);
        onSimulationResult(result);
      }
    } catch (err: any) {
      if (currentReq === activeReqRef.current) {
        setError(sanitizeErrorMessage(err, 'Simulation execution failed.'));
        setSimulationResult(null);
        onSimulationResult(null);
      }
    } finally {
      if (currentReq === activeReqRef.current) {
        setLoading(false);
      }
    }
  };

  // Keep ref to onSimulationResult to prevent parent re-renders from triggering resets
  const onSimulationResultRef = useRef(onSimulationResult);
  useEffect(() => {
    onSimulationResultRef.current = onSimulationResult;
  });

  // When location changes: reset interventions and clear simulation
  useEffect(() => {
    setSimulationResult(null);
    setSelectedInterventions(new Set());
    setError(null);
    onSimulationResultRef.current?.(null);
  }, [locationId]);

  // When year or scenario changes: if interventions are selected, immediately update calculated analysis!
  useEffect(() => {
    if (locationId && selectedInterventions.size > 0) {
      runSimulationForParams(locationId, year, scenario, Array.from(selectedInterventions));
    } else {
      setSimulationResult(null);
      setError(null);
      onSimulationResultRef.current?.(null);
    }
  }, [year, scenario, locationId]);

  const handleToggleIntervention = (slug: string) => {
    const next = new Set(selectedInterventions);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    setSelectedInterventions(next);
  };

  const handleRunSimulation = async () => {
    if (!locationId) return;
    await runSimulationForParams(locationId, year, scenario, Array.from(selectedInterventions));
  };

  const handleReset = () => {
    activeReqRef.current++;
    setSelectedInterventions(new Set());
    setSimulationResult(null);
    setError(null);
    onSimulationResult(null);
  };

  const formatDelta = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined) return '--';
    if (val === 0) return '0' + unit;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}${unit}`;
  };

  const getDeltaBadgeClass = (val: number | null | undefined, isGoodDecrease = true) => {
    if (val === null || val === undefined || val === 0) return 'text-text-silver bg-mid-dark';
    const isPositiveChange = val > 0;
    const isImproved = isGoodDecrease ? !isPositiveChange : isPositiveChange;
    return isImproved
      ? 'text-[#1ed760] bg-[#1ed760]/10'
      : 'text-red-500 bg-red-500/10';
  };

  const formatRiskLevel = (level: any) => {
    if (!level || level === 'UNAVAILABLE') return 'Unavailable';
    const lvlStr = typeof level === 'object' && level.level ? level.level : String(level);
    return lvlStr.replace('_', ' ');
  };

  // Structured indicators list for comparative table
  const metricsList = [
    {
      name: 'Avg Temperature',
      unit: '°C',
      before: simulationResult?.baseline.temperature !== null && simulationResult?.baseline.temperature !== undefined
        ? `${simulationResult.baseline.temperature.toFixed(1)}°C`
        : null,
      after: simulationResult?.afterSimulation.temperature !== null && simulationResult?.afterSimulation.temperature !== undefined
        ? `${simulationResult.afterSimulation.temperature.toFixed(1)}°C`
        : null,
      delta: simulationResult?.impact.temperature ?? null,
      isGoodDecrease: true,
    },
    {
      name: 'Precipitation',
      unit: ' mm',
      before: simulationResult?.baseline.precipitation !== null && simulationResult?.baseline.precipitation !== undefined
        ? `${simulationResult.baseline.precipitation} mm`
        : null,
      after: simulationResult?.afterSimulation.precipitation !== null && simulationResult?.afterSimulation.precipitation !== undefined
        ? `${simulationResult.afterSimulation.precipitation} mm`
        : null,
      delta: simulationResult?.impact.precipitation ?? null,
      isGoodDecrease: false,
    },
    {
      name: 'Heat Risk',
      unit: '',
      before: formatRiskLevel(simulationResult?.baseline.heatRisk?.level),
      after: formatRiskLevel(simulationResult?.afterSimulation.heatRisk?.level),
      delta: simulationResult?.impact.heatRisk?.deltaScore ?? null,
      isGoodDecrease: true,
      customDelta: simulationResult?.impact.heatRisk?.deltaScore
        ? `${simulationResult.impact.heatRisk.deltaScore > 0 ? '+' : ''}${simulationResult.impact.heatRisk.deltaScore.toFixed(2)}`
        : simulationResult?.baseline.heatRisk?.level !== simulationResult?.afterSimulation.heatRisk?.level
        ? 'Shifted'
        : 'No Change',
    },
    {
      name: 'Flood Risk',
      unit: '',
      before: formatRiskLevel(simulationResult?.baseline.floodRiskDetails?.level ?? simulationResult?.baseline.floodRisk),
      after: formatRiskLevel(simulationResult?.afterSimulation.floodRiskDetails?.level ?? simulationResult?.afterSimulation.floodRisk),
      delta: simulationResult?.impact.floodRisk?.deltaScore ?? null,
      isGoodDecrease: true,
      customDelta: simulationResult?.impact.floodRisk?.deltaScore
        ? `${simulationResult.impact.floodRisk.deltaScore > 0 ? '+' : ''}${simulationResult.impact.floodRisk.deltaScore.toFixed(2)}`
        : simulationResult?.baseline.floodRisk !== simulationResult?.afterSimulation.floodRisk
        ? 'Shifted'
        : 'No Change',
    },
    {
      name: 'Water Stress',
      unit: '%',
      before: simulationResult?.baseline.waterStress?.percentage !== null && simulationResult?.baseline.waterStress?.percentage !== undefined
        ? `${simulationResult.baseline.waterStress.percentage}%`
        : simulationResult?.baseline.waterAvailability !== null && simulationResult?.baseline.waterAvailability !== undefined
        ? `${Math.max(0, 100 - simulationResult.baseline.waterAvailability)}%`
        : null,
      after: simulationResult?.afterSimulation.waterStress?.percentage !== null && simulationResult?.afterSimulation.waterStress?.percentage !== undefined
        ? `${simulationResult.afterSimulation.waterStress.percentage}%`
        : simulationResult?.afterSimulation.waterAvailability !== null && simulationResult?.afterSimulation.waterAvailability !== undefined
        ? `${Math.max(0, 100 - simulationResult.afterSimulation.waterAvailability)}%`
        : null,
      delta: simulationResult?.impact.waterStress?.deltaPercentage ?? (simulationResult?.impact.waterAvailability !== null && simulationResult?.impact.waterAvailability !== undefined ? -simulationResult.impact.waterAvailability : null),
      isGoodDecrease: true,
    },
    {
      name: 'Overall Risk Score',
      unit: ' pts',
      before: simulationResult?.baseline.overallRiskScore !== null && simulationResult?.baseline.overallRiskScore !== undefined
        ? `${simulationResult.baseline.overallRiskScore}/100`
        : null,
      after: simulationResult?.afterSimulation.overallRiskScore !== null && simulationResult?.afterSimulation.overallRiskScore !== undefined
        ? `${simulationResult.afterSimulation.overallRiskScore}/100`
        : null,
      delta: simulationResult?.impact.overallRiskScore?.change ?? null,
      isGoodDecrease: true,
    },
    {
      name: 'Air Quality Index',
      unit: '',
      before: simulationResult?.baseline.airQualityIndex !== null && simulationResult?.baseline.airQualityIndex !== undefined
        ? `${simulationResult.baseline.airQualityIndex}`
        : null,
      after: simulationResult?.afterSimulation.airQualityIndex !== null && simulationResult?.afterSimulation.airQualityIndex !== undefined
        ? `${simulationResult.afterSimulation.airQualityIndex}`
        : null,
      delta: simulationResult?.impact.airQualityIndex ?? null,
      isGoodDecrease: true,
    },
    {
      name: 'CO2 Emissions',
      unit: '%',
      before: simulationResult?.baseline.co2Emissions !== null && simulationResult?.baseline.co2Emissions !== undefined
        ? `${simulationResult.baseline.co2Emissions > 0 ? '+' : ''}${simulationResult.baseline.co2Emissions.toFixed(1)}%`
        : null,
      after: simulationResult?.afterSimulation.co2Emissions !== null && simulationResult?.afterSimulation.co2Emissions !== undefined
        ? `${simulationResult.afterSimulation.co2Emissions > 0 ? '+' : ''}${simulationResult.afterSimulation.co2Emissions.toFixed(1)}%`
        : null,
      delta: simulationResult?.impact.co2Emissions ?? null,
      isGoodDecrease: true,
    },
  ];

  return (
    <Card className="flex flex-col min-h-[360px] bg-dark-surface border border-border-gray">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-border-gray/50 pb-2">
        <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
          <Sliders size={18} className="text-spotify-green animate-pulse" />
          <span>Scenario Simulator</span>
        </h3>
        {(selectedInterventions.size > 0 || simulationResult) && (
          <button
            onClick={handleReset}
            disabled={loading}
            className="text-[10px] text-text-silver hover:text-text-base transition-colors duration-200 uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Interventions selection */}
        <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between border border-border-gray/20">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-silver uppercase tracking-wider mb-2 flex items-center gap-2 select-none">
              <CheckSquare size={14} className="text-spotify-green" />
              <span>Select Interventions</span>
            </h4>
            <div className="space-y-2.5">
              {interventions.map((item) => {
                const isChecked = selectedInterventions.has(item.slug);
                return (
                  <label
                    key={item.slug}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      isChecked
                        ? 'bg-dark-surface text-text-base border border-spotify-green/30'
                        : 'text-text-silver hover:bg-dark-surface/50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={loading || !locationId}
                      onChange={() => handleToggleIntervention(item.slug)}
                      className="mt-1 rounded bg-dark-surface border-border-gray text-spotify-green focus:ring-spotify-green cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold flex items-center gap-1.5 leading-snug">
                        <span className="text-spotify-green">{item.icon}</span>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-text-silver/70 leading-normal mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunSimulation}
            disabled={loading || !locationId}
            className="mt-5 w-full bg-spotify-green hover:bg-[#1fdf64] hover:scale-[1.02] text-black font-sans font-bold py-2 border-none transition-all duration-200 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <span>Run Simulation</span>
            )}
          </Button>
        </div>

        {/* Right Side: Simulation Results / Predicted Impact */}
        <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between border border-border-gray/20 min-h-[300px]">
          <div className="flex flex-col h-full">
            <h4 className="text-xs font-bold text-text-silver uppercase tracking-wider mb-3">
              Simulation Impact ({year})
            </h4>

            {error && (
              <div className="flex-grow flex items-center justify-center p-4">
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {!error && !simulationResult && (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <Sliders size={36} className="text-text-silver/30 mb-2" />
                <p className="text-xs text-text-silver italic leading-relaxed max-w-[220px]">
                  Configure environmental interventions and click Run Simulation.
                </p>
              </div>
            )}

            {!error && simulationResult && (
              <div className="flex-grow flex flex-col justify-between">
                <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                  <table className="w-full min-w-[380px] text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-border-gray/50 text-[10px] uppercase text-text-silver/70 font-bold sticky top-0 bg-mid-dark">
                        <th className="py-2">Indicator</th>
                        <th className="py-2 text-right">Before</th>
                        <th className="py-2 text-right">After</th>
                        <th className="py-2 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-gray/20">
                      {metricsList.map((metric) => {
                        const isAvailable = metric.before !== null;
                        return (
                          <tr key={metric.name} className="hover:bg-dark-surface/10">
                            <td className="py-2 font-bold text-text-base text-[11px]">
                              {metric.name}
                            </td>
                            {isAvailable ? (
                              <>
                                <td className="py-2 text-right font-mono text-[11px] text-text-silver">
                                  {metric.before}
                                </td>
                                <td className="py-2 text-right font-mono text-[11px] text-text-base">
                                  {metric.after}
                                </td>
                                <td className="py-2 text-right font-mono text-[11px]">
                                  {metric.customDelta ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-dark-surface text-text-silver font-bold">
                                      {metric.customDelta}
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${getDeltaBadgeClass(metric.delta, metric.isGoodDecrease)}`}>
                                      {formatDelta(metric.delta, metric.unit)}
                                    </span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <td colSpan={3} className="py-2 text-right font-sans text-[11px] text-text-silver/60">
                                Unavailable
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 pt-2 border-t border-border-gray/30 flex flex-col gap-1 text-[10px] text-text-silver/60 leading-snug">
                  <div className="flex items-center justify-between">
                    <span>Scenario: <strong className="text-text-silver font-sans">{simulationResult.scenarioName || 'Baseline'}</strong></span>
                    <span>Engine: {simulationResult.provenance?.engineVersion ? `v${simulationResult.provenance.engineVersion}` : 'v2.0'}</span>
                  </div>
                  <p className="italic text-[9px] text-text-silver/50 mt-0.5">
                    Calculated scenario simulation based on deterministic rule models and trend extrapolation. Not an official meteorological forecast.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScenarioSimulator;
