import React, { useState, useEffect } from 'react';
import { Sliders, CheckSquare, TreePine, Sun, Droplet, Home, Bus, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { simulationService } from '../../services/simulationService.js';
import { SimulationResult } from '../../types/domain.js';

interface ScenarioSimulatorProps {
  locationId: string | undefined;
  year: number;
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
  onSimulationResult,
}) => {
  const [selectedInterventions, setSelectedInterventions] = useState<Set<string>>(new Set());
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      description: 'Store surface runoff to replenish aquifers.',
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

  // Reset when location changes
  useEffect(() => {
    setSimulationResult(null);
    setSelectedInterventions(new Set());
    setError(null);
    onSimulationResult(null);
  }, [locationId, onSimulationResult]);

  // Reset when year changes to keep simulation context consistent
  useEffect(() => {
    setSimulationResult(null);
    setError(null);
    onSimulationResult(null);
  }, [year, onSimulationResult]);

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
    setLoading(true);
    setError(null);

    try {
      const result = await simulationService.runSimulation(
        locationId,
        year,
        Array.from(selectedInterventions)
      );
      setSimulationResult(result);
      onSimulationResult(result);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed.');
      setSimulationResult(null);
      onSimulationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedInterventions(new Set());
    setSimulationResult(null);
    setError(null);
    onSimulationResult(null);
  };

  const formatDelta = (val: number | null, unit: string) => {
    if (val === null) return '--';
    if (val === 0) return '0' + unit;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}${unit}`;
  };

  const getDeltaBadgeClass = (val: number | null, isGoodDecrease = true) => {
    if (val === null || val === 0) return 'text-text-silver bg-mid-dark';
    const isPositiveChange = val > 0;
    const isImproved = isGoodDecrease ? !isPositiveChange : isPositiveChange;
    return isImproved
      ? 'text-[#1ed760] bg-[#1ed760]/10'
      : 'text-red-500 bg-red-500/10';
  };

  const formatRiskLevel = (level: string | null) => {
    if (!level || level === 'UNAVAILABLE') return 'Unavailable';
    return level.replace('_', ' ');
  };

  // Helper to map values for comparative table
  const metricsList = [
    {
      name: 'Avg Temperature',
      unit: '°C',
      before: simulationResult?.baseline.temperature !== null && simulationResult?.baseline.temperature !== undefined ? `${simulationResult.baseline.temperature.toFixed(1)}°C` : null,
      after: simulationResult?.afterSimulation.temperature !== null && simulationResult?.afterSimulation.temperature !== undefined ? `${simulationResult.afterSimulation.temperature.toFixed(1)}°C` : null,
      delta: simulationResult?.impact.temperature ?? null,
      isGoodDecrease: true,
    },
    {
      name: 'Flood Risk',
      unit: '',
      before: formatRiskLevel(simulationResult?.baseline.floodRisk ?? null),
      after: formatRiskLevel(simulationResult?.afterSimulation.floodRisk ?? null),
      delta: null,
      isGoodDecrease: true,
      customDelta: simulationResult ? 'No Change' : null,
    },
    {
      name: 'Water Stress',
      unit: '%',
      before: null,
      after: null,
      delta: null,
      isGoodDecrease: true,
    },
    {
      name: 'Air Quality Index',
      unit: '',
      before: null,
      after: null,
      delta: null,
      isGoodDecrease: true,
    },
    {
      name: 'CO2 Emissions',
      unit: ' Mt',
      before: null,
      after: null,
      delta: null,
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-border-gray/50 text-[10px] uppercase text-text-silver/70 font-bold">
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
                            <td className="py-2.5 font-bold text-text-base text-[11px]">
                              {metric.name}
                            </td>
                            {isAvailable ? (
                              <>
                                <td className="py-2.5 text-right font-mono text-[11px] text-text-silver">
                                  {metric.before}
                                </td>
                                <td className="py-2.5 text-right font-mono text-[11px] text-text-base">
                                  {metric.after}
                                </td>
                                <td className="py-2.5 text-right font-mono text-[11px]">
                                  {metric.customDelta ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-mid-dark text-text-silver font-bold">
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
                              <td colSpan={3} className="py-2.5 text-right font-sans text-[11px] text-text-silver/60">
                                Unavailable
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-3 border-t border-border-gray/30 flex items-center justify-between text-[10px] text-text-silver/60 leading-snug">
                  <span>Engine: Version 1.0</span>
                  <span>Estimate basis: Rule Model</span>
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
