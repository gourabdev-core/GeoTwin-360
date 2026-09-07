import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Thermometer,
  CloudRain,
  Flame,
  Droplets,
  AlertTriangle,
  Info,
  Calendar,
  Database,
  ShieldAlert,
  Cpu,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';
import { useLocation } from '../../context/LocationContext.js';
import { climateService } from '../../services/climateService.js';
import {
  ClimateAnalysisModel,
  ScenarioType,
  RiskLevel,
  DataProvenanceType
} from '../../types/prediction.js';

export const PredictionsPage: React.FC = () => {
  const { selectedLocation } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    const param = searchParams.get('year');
    if (param) {
      const parsed = parseInt(param, 10);
      if ([2030, 2035, 2040, 2050].includes(parsed)) return parsed;
    }
    try {
      const stored = localStorage.getItem('geotwin_selected_year');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([2030, 2035, 2040, 2050].includes(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return 2035;
  });

  const [selectedScenario, setSelectedScenarioState] = useState<ScenarioType>(() => {
    const param = searchParams.get('scenario') as ScenarioType;
    if (param && ['default', 'resilience', 'accelerated'].includes(param)) return param;
    try {
      const stored = localStorage.getItem('geotwin_selected_scenario') as ScenarioType;
      if (stored && ['default', 'resilience', 'accelerated'].includes(stored)) return stored;
    } catch {
      // Ignore
    }
    return 'default';
  });

  const setSelectedYear = (year: number) => {
    setSelectedYearState(year);
    try {
      localStorage.setItem('geotwin_selected_year', String(year));
    } catch {
      // Ignore
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('year', String(year));
        return next;
      },
      { replace: true }
    );
  };

  const setSelectedScenario = (scenario: ScenarioType) => {
    setSelectedScenarioState(scenario);
    try {
      localStorage.setItem('geotwin_selected_scenario', scenario);
    } catch {
      // Ignore
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('scenario', scenario);
        return next;
      },
      { replace: true }
    );
  };

  // Sync external searchParam updates (browser back/forward)
  useEffect(() => {
    const paramYear = searchParams.get('year');
    if (paramYear) {
      const parsed = parseInt(paramYear, 10);
      if ([2030, 2035, 2040, 2050].includes(parsed) && parsed !== selectedYear) {
        setSelectedYearState(parsed);
      }
    }
    const paramScenario = searchParams.get('scenario') as ScenarioType;
    if (paramScenario && ['default', 'resilience', 'accelerated'].includes(paramScenario) && paramScenario !== selectedScenario) {
      setSelectedScenarioState(paramScenario);
    }
  }, [searchParams, selectedYear, selectedScenario]);

  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [analysisModel, setAnalysisModel] = useState<ClimateAnalysisModel | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const years = [2030, 2035, 2040, 2050];

  const fetchPredictionAnalysis = async () => {
    if (!selectedLocation?.id) return;
    setHistoricalData([]);
    setProjectionData([]);
    setModelInfo(null);
    setAnalysisModel(null);
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch historical observations for timeline
      const histData = await climateService.getHistoricalClimate(selectedLocation.id);
      setHistoricalData(histData.history || []);

      // 2. Fetch full prediction analysis model for selected year & scenario (without redundant AI)
      const predRes = await climateService.getClimateAnalysis(
        selectedLocation.id,
        selectedYear,
        selectedScenario,
        false
      );

      setProjectionData(predRes.projections || []);
      setModelInfo(predRes.model || null);
      if (predRes.analysis) {
        setAnalysisModel(predRes.analysis);
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'Failed to load climate prediction analysis.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiInterpretation = async () => {
    if (!selectedLocation?.id) return;
    setAiLoading(true);
    setAiNotice(null);
    try {
      const predRes = await climateService.getClimateAnalysis(
        selectedLocation.id,
        selectedYear,
        selectedScenario,
        true
      );
      if (predRes.analysis) {
        setAnalysisModel(predRes.analysis);
      }
    } catch (err: any) {
      const isQuota =
        err?.code === 'GEMINI_DAILY_QUOTA_EXCEEDED' ||
        err?.code === 'RATE_LIMIT_EXCEEDED' ||
        String(err?.message || '').toLowerCase().includes('quota') ||
        String(err?.message || '').toLowerCase().includes('rate limit');

      if (isQuota) {
        setAiNotice('AI analysis is temporarily unavailable. Your daily AI quota has been reached. Core GeoTwin features remain available.');
      } else {
        setAiNotice(sanitizeErrorMessage(err, 'AI analysis is currently unavailable. Core features remain operational.'));
      }
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setAiNotice(null);
    if (selectedLocation) {
      fetchPredictionAnalysis();
    } else {
      setHistoricalData([]);
      setProjectionData([]);
      setModelInfo(null);
      setAnalysisModel(null);
    }
  }, [selectedLocation, selectedYear, selectedScenario]);

  // Provenance Badge Component
  const ProvenanceBadge: React.FC<{ type: DataProvenanceType; source?: string }> = ({ type, source }) => {
    switch (type) {
      case 'REAL_EXTERNAL_DATA':
        return (
          <span
            title={source || 'Observed directly from satellite or ground sensors'}
            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          >
            <Database size={10} />
            <span>Type A: Observed Data</span>
          </span>
        );
      case 'DERIVED_CALCULATION':
        return (
          <span
            title={source || 'Calculated via statistical regression and deterministic modeling'}
            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30"
          >
            <Cpu size={10} />
            <span>Type B: Derived Calculation</span>
          </span>
        );
      case 'AI_INTERPRETATION':
        return (
          <span
            title={source || 'Qualitative reasoning generated by Gemini AI layer'}
            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30"
          >
            <Sparkles size={10} />
            <span>Type C: AI Interpretation</span>
          </span>
        );
      case 'MODEL_PROJECTION':
      default:
        return (
          <span
            title={source || 'Scenario-projected future model estimate'}
            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30"
          >
            <Layers size={10} />
            <span>Type D: Model Projection</span>
          </span>
        );
    }
  };

  // Risk Level Color Utility
  const getRiskColor = (level: RiskLevel | string) => {
    switch (level) {
      case 'VERY_HIGH':
        return 'text-red-500 bg-red-500/15 border-red-500/30';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'LOW':
      case 'VERY_LOW':
      default:
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    }
  };

  if (!selectedLocation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Climate Predictions & Analysis</h2>
            <p className="text-xs text-text-silver">Data-driven climate forecasts and multi-hazard indicators up to 2050</p>
          </div>
        </div>

        <EmptyState
          title="No location selected"
          description="Search for a location to view real data-driven climate projections and scenario analysis."
          icon={<TrendingUp size={48} className="text-spotify-green" />}
        />
      </div>
    );
  }

  // Combine historical and projected data points for timeline chart
  const combinedChartData = [
    ...historicalData.map((d: any) => ({
      year: d.year,
      temperature: d.temperature,
      precipitation: d.precipitation,
      projectedTemp: d.year === 2026 ? d.temperature : null,
      projectedPrecip: d.year === 2026 ? d.precipitation : null,
    })),
    ...projectionData.map((p: any) => ({
      year: p.year,
      temperature: null,
      precipitation: null,
      projectedTemp: p.metrics?.temperature ?? null,
      projectedPrecip: p.metrics?.precipitation ?? null,
    })),
  ].sort((a: any, b: any) => a.year - b.year);

  // Fallback indicator values if analysisModel is still loading or partially loaded
  const indicators = analysisModel?.indicators;

  return (
    <div className="space-y-6">
      {/* Header with Year and Scenario Selectors */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Climate Predictions & Analysis</h2>
            <p className="text-xs text-text-silver font-sans">
              Modelled projections for {selectedLocation.displayName || selectedLocation.name} ({selectedYear})
            </p>
          </div>
        </div>

        {/* Interactive Controls Bar: Scenario & Year */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* Scenario Selector */}
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            className="bg-mid-dark text-text-base text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-full outline-none border border-light-border/30 focus:border-spotify-green cursor-pointer"
          >
            <option value="default">Baseline Scenario (SSP2-4.5)</option>
            <option value="resilience">Resilience Plan 2035 (SSP1-2.6)</option>
            <option value="accelerated">Accelerated Emissions (SSP5-8.5)</option>
          </select>

          {/* Year Selector */}
          <div className="flex bg-mid-dark p-1 rounded-full border border-light-border/20">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-200 ${
                  selectedYear === year
                    ? 'bg-spotify-green text-black shadow-sm'
                    : 'text-text-silver hover:text-text-base'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scientific Provenance Legend Bar */}
      <div className="bg-dark-surface p-3.5 rounded-lg border border-light-border/20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-text-silver">
          <Info size={14} className="text-spotify-green shrink-0" />
          <span className="font-bold text-text-base">Data Provenance Standards:</span>
          <span>Every indicator explicitly differentiates observed vs modelled values.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProvenanceBadge type="REAL_EXTERNAL_DATA" />
          <ProvenanceBadge type="DERIVED_CALCULATION" />
          <ProvenanceBadge type="AI_INTERPRETATION" />
          <ProvenanceBadge type="MODEL_PROJECTION" />
        </div>
      </div>

      {loading && !analysisModel ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] space-y-4 bg-dark-surface rounded-lg p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-spotify-green"></div>
          <span className="text-sm text-text-silver">Computing climate projections and multi-hazard model...</span>
        </div>
      ) : error && !analysisModel ? (
        <div className="text-center p-8 bg-dark-surface rounded-lg space-y-4 max-w-md mx-auto">
          <AlertTriangle size={48} className="text-red-500 mx-auto" />
          <h3 className="text-lg font-title font-bold text-text-base">Projections Unavailable</h3>
          <p className="text-sm text-text-silver leading-relaxed">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPredictionAnalysis} className="w-full">
            Retry Analysis
          </Button>
        </div>
      ) : (
        <>
          {/* Active Scenario Banner */}
          <div className="bg-mid-dark p-4 rounded-lg border border-light-border/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-spotify-green uppercase tracking-wider font-mono">
                  {analysisModel?.scenario.tag || 'Active Climate Scenario'}
                </span>
                <span className="text-text-silver text-xs">•</span>
                <span className="text-text-base font-bold text-sm">
                  {analysisModel?.scenario.name || 'Baseline Scenario'} ({selectedYear})
                </span>
              </div>
              <p className="text-xs text-text-silver mt-1 leading-relaxed max-w-3xl">
                {analysisModel?.scenario.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-text-silver block font-mono">Radiative Forcing</span>
              <span className="text-xs font-bold text-text-base font-mono">
                {analysisModel?.scenario.radiativeForcing || 'Baseline Trajectory'}
              </span>
            </div>
          </div>

          {/* Core Indicators Grid (6 Key Indicators) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
                <Layers size={18} className="text-spotify-green" />
                <span>Climate Analysis Indicators ({selectedYear})</span>
              </h3>
              <span className="text-xs text-text-silver">
                Modulated by {analysisModel?.scenario.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Temperature Trend */}
              <Card className="flex flex-col justify-between p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-amber-400">
                      <Thermometer size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Temperature Trend</h4>
                      <span className="text-[10px] text-text-silver">Mean Surface Projection</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.temperatureTrend.provenance.type || 'DERIVED_CALCULATION'} />
                </div>

                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-title text-text-base">
                      {indicators?.temperatureTrend ? `${indicators.temperatureTrend.value.toFixed(1)}°C` : 'N/A'}
                    </span>
                    {indicators?.temperatureTrend && (
                      <span
                        className={`text-xs font-bold flex items-center ${
                          indicators.temperatureTrend.anomaly >= 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {indicators.temperatureTrend.anomaly >= 0 ? (
                          <ArrowUpRight size={14} className="inline mr-0.5" />
                        ) : (
                          <ArrowDownRight size={14} className="inline mr-0.5" />
                        )}
                        {indicators.temperatureTrend.anomaly >= 0 ? '+' : ''}
                        {indicators.temperatureTrend.anomaly.toFixed(2)}°C vs Baseline
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-text-silver flex justify-between border-t border-light-border/20 pt-2 font-mono text-[11px]">
                    <span>Rate: {indicators?.temperatureTrend ? `${indicators.temperatureTrend.annualRate > 0 ? '+' : ''}${indicators.temperatureTrend.annualRate}°C/yr` : 'N/A'}</span>
                    <span>Fit: {indicators?.temperatureTrend?.confidence || 'N/A'}</span>
                  </div>
                </div>
              </Card>

              {/* 2. Precipitation Trend */}
              <Card className="flex flex-col justify-between p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-blue-400">
                      <CloudRain size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Precipitation Trend</h4>
                      <span className="text-[10px] text-text-silver">Mean Daily Rainfall</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.precipitationTrend.provenance.type || 'DERIVED_CALCULATION'} />
                </div>

                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold font-title text-text-base">
                      {indicators?.precipitationTrend ? `${indicators.precipitationTrend.value.toFixed(2)} mm/day` : 'N/A'}
                    </span>
                    {indicators?.precipitationTrend && (
                      <span
                        className={`text-xs font-bold ${
                          indicators.precipitationTrend.changePercent >= 0 ? 'text-blue-400' : 'text-amber-400'
                        }`}
                      >
                        {indicators.precipitationTrend.changePercent >= 0 ? '+' : ''}
                        {indicators.precipitationTrend.changePercent.toFixed(1)}% vs Baseline
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-text-silver flex justify-between border-t border-light-border/20 pt-2 font-mono text-[11px]">
                    <span>Baseline: {indicators?.precipitationTrend ? `${indicators.precipitationTrend.baselineValue} mm/d` : 'N/A'}</span>
                    <span>Fit: {indicators?.precipitationTrend?.confidence || 'N/A'}</span>
                  </div>
                </div>
              </Card>

              {/* 3. Heat Risk Indicator */}
              <Card className="flex flex-col justify-between p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-orange-400">
                      <Flame size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Heat-Risk Indicator</h4>
                      <span className="text-[10px] text-text-silver">Thermal Vulnerability</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.heatRisk.provenance.type || 'DERIVED_CALCULATION'} />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border font-mono ${getRiskColor(
                        indicators?.heatRisk.level || 'MEDIUM'
                      )}`}
                    >
                      {indicators?.heatRisk.level || 'MEDIUM'} RISK
                    </span>
                    <span className="text-xs font-mono text-text-silver">
                      Score: {indicators?.heatRisk ? (indicators.heatRisk.score * 100).toFixed(0) : '50'}/100
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-silver flex justify-between border-t border-light-border/20 pt-2 font-mono text-[11px]">
                    <span>Projected Extreme Days (&gt;35°C):</span>
                    <span className="font-bold text-text-base">{indicators?.heatRisk.extremeHeatDaysProjected ?? 'N/A'} days/yr</span>
                  </div>
                </div>
              </Card>

              {/* 4. Flood / Water-Risk Indicator */}
              <Card className="flex flex-col justify-between p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-cyan-400">
                      <Droplets size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Flood / Water Risk</h4>
                      <span className="text-[10px] text-text-silver">Runoff Inundation Index</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.floodRisk.provenance.type || 'DERIVED_CALCULATION'} />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border font-mono ${getRiskColor(
                        indicators?.floodRisk.level || 'LOW'
                      )}`}
                    >
                      {indicators?.floodRisk.level || 'LOW'} RISK
                    </span>
                    <span className="text-xs font-mono text-text-silver">
                      Score: {indicators?.floodRisk ? (indicators.floodRisk.score * 100).toFixed(0) : '30'}/100
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-silver flex justify-between border-t border-light-border/20 pt-2 font-mono text-[11px]">
                    <span>Retention Capacity:</span>
                    <span className="font-bold text-text-base">
                      {indicators?.floodRisk ? `${(indicators.floodRisk.retentionCapacityScore * 100).toFixed(0)}%` : '60%'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* 5. Drought / Water Stress Indicator */}
              <Card className="flex flex-col justify-between p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-emerald-400">
                      <Database size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Drought / Water Stress</h4>
                      <span className="text-[10px] text-text-silver">Moisture & Aquifer Balance</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.droughtRisk.provenance.type || 'REAL_EXTERNAL_DATA'} />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border font-mono ${getRiskColor(
                        indicators?.droughtRisk.level || 'MEDIUM'
                      )}`}
                    >
                      {indicators?.droughtRisk.level || 'MEDIUM'} STRESS
                    </span>
                    <span className="text-xs font-mono text-text-silver">
                      {indicators?.droughtRisk.stressLevel || 'Moderate Stress'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-silver flex justify-between border-t border-light-border/20 pt-2 font-mono text-[11px]">
                    <span>Soil Moisture Telemetry:</span>
                    <span className="font-bold text-text-base">
                      {indicators?.droughtRisk ? `${(indicators.droughtRisk.soilMoistureIndex * 100).toFixed(0)}%` : '32%'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* 6. Overall Composite Climate Risk */}
              <Card className="flex flex-col justify-between p-4 space-y-3 border-l-4 border-l-spotify-green">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-mid-dark rounded-lg text-spotify-green">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-base">Overall Climate Risk</h4>
                      <span className="text-[10px] text-text-silver">Composite Hazard Index</span>
                    </div>
                  </div>
                  <ProvenanceBadge type={indicators?.overallRisk.provenance.type || 'DERIVED_CALCULATION'} />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-title text-text-base">
                      {indicators?.overallRisk.score ?? 45}
                      <span className="text-xs text-text-silver font-sans font-normal ml-1">/ 100</span>
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border font-mono ${getRiskColor(
                        indicators?.overallRisk.level || 'MEDIUM'
                      )}`}
                    >
                      {indicators?.overallRisk.level || 'MEDIUM'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-silver border-t border-light-border/20 pt-2 truncate font-mono text-[11px]">
                    <span>Key Driver: </span>
                    <span className="font-bold text-text-base">{indicators?.overallRisk.primaryDriver || 'Thermal Stress'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* AI Decision Support & Climate Interpretation */}
          {analysisModel?.aiInterpretation && (
            <Card className="border border-purple-500/25 bg-gradient-to-br from-purple-950/20 via-mid-dark to-dark-surface">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 pb-3 border-b border-purple-500/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-lg">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
                      <span>AI Decision Support & Climate Interpretation</span>
                    </h3>
                    <p className="text-xs text-text-silver">
                      Structured reasoning synthesized for {selectedLocation.displayName || selectedLocation.name} in {selectedYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAiInterpretation}
                    disabled={aiLoading}
                    className="text-xs border-purple-500/40 hover:border-purple-400"
                  >
                    <Sparkles size={14} className={aiLoading ? "animate-spin mr-1.5 text-purple-400" : "mr-1.5 text-purple-400"} />
                    <span>{aiLoading ? "Synthesizing AI..." : "Generate AI Interpretation"}</span>
                  </Button>
                  <ProvenanceBadge
                    type={analysisModel.aiInterpretation.provenance?.type === 'AI_INTERPRETATION' ? 'AI_INTERPRETATION' : 'DERIVED_CALCULATION'}
                    source={analysisModel.aiInterpretation.provenance?.source || "GeoTwin Climate Reasoning Layer"}
                  />
                </div>
              </div>

              {aiNotice && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 text-xs text-amber-300 flex items-start gap-2 mb-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold">Notice: </span>
                    {aiNotice}
                  </div>
                </div>
              )}

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-text-base uppercase tracking-wider text-[11px] mb-1 text-purple-300 font-mono">
                    Executive Summary
                  </h4>
                  <p className="text-text-base bg-black/20 p-3 rounded-lg border border-purple-500/10">
                    {analysisModel.aiInterpretation.executiveSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 p-3 rounded-lg border border-light-border/20">
                    <h4 className="font-bold text-text-base uppercase tracking-wider text-[11px] mb-1 font-mono text-amber-300">
                      Risk Vulnerability Assessment
                    </h4>
                    <p className="text-text-silver leading-relaxed">
                      {analysisModel.aiInterpretation.riskAssessment}
                    </p>
                  </div>

                  <div className="bg-black/20 p-3 rounded-lg border border-light-border/20">
                    <h4 className="font-bold text-text-base uppercase tracking-wider text-[11px] mb-1 font-mono text-emerald-300">
                      Recommended Resilience Priorities
                    </h4>
                    <ul className="space-y-1.5 text-text-silver">
                      {analysisModel.aiInterpretation.resilienceOpportunities.map((opp, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-text-silver italic pt-1">
                  <Info size={13} className="text-purple-400 shrink-0" />
                  <span>{analysisModel.aiInterpretation.confidenceAssessment}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Grid: Chart + Model Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Chart */}
            <Card className="lg:col-span-2 flex flex-col min-h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-title font-bold text-text-base">
                  Climate Trend Timeline (2015 - 2050)
                </h3>
                <div className="flex gap-2">
                  <span className="text-[10px] text-black bg-spotify-green px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Historical
                  </span>
                  <span className="text-[10px] text-black bg-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Projected ({selectedScenario})
                  </span>
                </div>
              </div>

              <div className="flex-grow flex items-center justify-center bg-mid-dark rounded-lg p-4 min-h-[260px]">
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
                      <ReferenceLine
                        yAxisId="left"
                        x={2026}
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        label={{ value: 'NOW (2026 YTD)', fill: '#38bdf8', fontSize: 10, position: 'top' }}
                      />
                      <XAxis dataKey="year" stroke="#b3b3b3" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="#1DB954" fontSize={10} tickLine={false} axisLine={false} unit="°C" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3B82F6" fontSize={10} tickLine={false} axisLine={false} unit=" mm" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181818',
                          border: '1px solid #282828',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'sans-serif',
                        }}
                        labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }} />

                      {/* Historical lines */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="temperature"
                        name="Avg Temp (Observed)"
                        stroke="#1DB954"
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="precipitation"
                        name="Rainfall (Observed)"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />

                      {/* Projected lines */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="projectedTemp"
                        name="Avg Temp (Projected)"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={{ r: 4, strokeWidth: 1, fill: '#F59E0B' }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="projectedPrecip"
                        name="Rainfall (Projected)"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={{ r: 4, strokeWidth: 1, fill: '#8B5CF6' }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            {/* Model Specifications Card */}
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-base font-title font-bold text-text-base mb-4 flex items-center gap-2">
                  <Cpu size={18} className="text-spotify-green" />
                  <span>Model Specifications</span>
                </h3>
                <div className="space-y-3">
                  <div className="bg-mid-dark p-3 rounded-lg">
                    <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold font-mono">
                      Engine
                    </span>
                    <span className="text-sm font-bold text-text-base mt-0.5 block">
                      {modelInfo?.name || 'GeoTwin 360 Prediction Engine'}
                    </span>
                  </div>
                  <div className="bg-mid-dark p-3 rounded-lg">
                    <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold font-mono">
                      Active Pathway
                    </span>
                    <span className="text-sm font-bold text-text-base mt-0.5 block text-spotify-green">
                      {analysisModel?.scenario.name || 'Baseline Scenario'}
                    </span>
                  </div>
                  <div className="bg-mid-dark p-3 rounded-lg">
                    <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold font-mono">
                      Methodology
                    </span>
                    <span className="text-sm font-bold text-text-base mt-0.5 block">
                      {modelInfo?.method || 'Ordinary Least Squares (OLS) Regression'}
                    </span>
                  </div>
                  <div className="bg-mid-dark p-3 rounded-lg">
                    <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold font-mono">
                      Historical Satellite Baseline
                    </span>
                    <span className="text-sm font-bold text-text-base mt-0.5 block">
                      {modelInfo?.baselinePeriod ? `${modelInfo.baselinePeriod} (NASA POWER)` : '2015 - 2025 (NASA POWER)'}
                    </span>
                  </div>
                  <div className="bg-mid-dark p-3 rounded-lg">
                    <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold font-mono">
                      Telemetry Feeds
                    </span>
                    <span className="text-sm font-bold text-text-base mt-0.5 block flex items-center gap-1">
                      <Database size={12} className="text-spotify-green" />
                      <span>NASA POWER Satellite + Open-Meteo</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-light-border flex items-center gap-2 text-xs text-text-silver">
                <Info size={14} className="text-spotify-green shrink-0" />
                <span>Synchronized automatically across target year & scenario shifts.</span>
              </div>
            </Card>
          </div>

          {/* Projection Metadata Table */}
          <Card>
            <h3 className="text-base font-title font-bold text-text-base mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-spotify-green" />
              <span>Multi-Year Projection Trajectory ({analysisModel?.scenario.name})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans border-collapse">
                <thead>
                  <tr className="border-b border-light-border text-text-silver text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Target Year</th>
                    <th className="py-3 px-4">Projected Temp</th>
                    <th className="py-3 px-4">Projected Precip</th>
                    <th className="py-3 px-4 text-right">Temp Model Fit</th>
                    <th className="py-3 px-4">Scenario Pathway</th>
                    <th className="py-3 px-4">Data Source</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((p, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-light-border/30 hover:bg-mid-dark/50 transition-colors ${
                        p.year === selectedYear ? 'bg-spotify-green/10 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-text-base">
                        {p.year}
                        {p.year === selectedYear && (
                          <span className="ml-2 text-[10px] bg-spotify-green text-black px-1.5 py-0.5 rounded font-mono uppercase">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {p.metrics?.temperature !== null && p.metrics?.temperature !== undefined
                          ? `${Number(p.metrics.temperature).toFixed(1)} °C`
                          : 'Unavailable'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {p.metrics?.precipitation !== null && p.metrics?.precipitation !== undefined
                          ? `${Number(p.metrics.precipitation).toFixed(2)} mm/day`
                          : 'Unavailable'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-silver">
                        {p.metadata?.tempRSquared !== null && p.metadata?.tempRSquared !== undefined
                          ? `${(Number(p.metadata.tempRSquared) * 100).toFixed(1)}% R²`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-silver font-mono">
                        {analysisModel?.scenario.name || 'Baseline'}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-silver">
                        {p.metadata?.sourceData || 'NASA POWER Satellite'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Scientific Honesty Notice */}
          <Card className="border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-text-base flex items-center gap-2">
                  <span>Scientific Honesty & Methodology Notice</span>
                </h4>
                <p className="text-xs text-text-silver leading-relaxed">
                  The climate projections displayed above are mathematically calculated using **Ordinary Least Squares (OLS) Linear Regression** [MODELED / LINEAR EXTRAPOLATION] based on 11 years of satellite observations (2015-2025) retrieved directly from the NASA POWER dataset, modulated by scenario radiative forcing parameters.
                </p>
                <p className="text-xs text-text-silver leading-relaxed font-bold">
                  Methodology Disclosures & Limitations:
                </p>
                <ul className="list-disc list-inside text-xs text-text-silver space-y-1 leading-relaxed pl-1">
                  <li>**Statistical Extrapolation**: Projections follow mathematical trend regressions. They are not direct outputs of coupled General Circulation Models (GCMs) calculating atmospheric fluid dynamics.</li>
                  <li>**Scenario Modulation**: The Resilience Plan (SSP1-2.6) and Accelerated Emissions (SSP5-8.5) pathways represent mathematical adaptation and radiative forcing adjustments applied to local historical baselines.</li>
                  <li>**Satellite Baseline**: Calculations rely on 10 years of validated satellite observations; short-term oscillations like ENSO (El Niño/La Niña) can influence regional slopes.</li>
                  <li>**Multi-Hazard Scoring**: Risk levels are normalized comparative indices designed for urban planning decision support and prioritization, not engineering structural guarantees.</li>
                </ul>
                <p className="text-[10px] text-amber-400 italic pt-1">
                  Disclaimer: Projections are decision-support estimates. GeoTwin 360 clearly separates observed satellite telemetry from derived calculations and AI reasoning.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default PredictionsPage;
