import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sliders,
  MapPin,
  Download,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { useLocation } from '../../context/LocationContext.js';
import { useWeather } from '../../context/WeatherContext.js';
import { ScenarioSimulator } from '../../components/dashboard/ScenarioSimulator.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { SimulationResult } from '../../types/domain.js';
import { SaveReportModal } from '../reports/SaveReportModal.js';
import { reportService } from '../../services/reportService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

export const SimulatorPage: React.FC = () => {
  const { selectedLocation, loading: locationLoading } = useLocation();
  const { weather } = useWeather();
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

  const [selectedScenario, setSelectedScenarioState] = useState<string>(() => {
    const param = searchParams.get('scenario');
    if (param && ['default', 'resilience', 'accelerated'].includes(param)) return param;
    try {
      const stored = localStorage.getItem('geotwin_selected_scenario');
      if (stored && ['default', 'resilience', 'accelerated'].includes(stored)) return stored;
    } catch {
      // Ignore
    }
    return 'default';
  });

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const years = [2030, 2035, 2040, 2050];

  const setSelectedYear = useCallback(
    (year: number) => {
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
    },
    [setSearchParams]
  );

  const setSelectedScenario = useCallback(
    (scenario: string) => {
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
    },
    [setSearchParams]
  );

  // Sync external searchParam updates (browser back/forward)
  useEffect(() => {
    const paramYear = searchParams.get('year');
    if (paramYear) {
      const parsed = parseInt(paramYear, 10);
      if ([2030, 2035, 2040, 2050].includes(parsed) && parsed !== selectedYear) {
        setSelectedYearState(parsed);
      }
    }
    const paramScenario = searchParams.get('scenario');
    if (paramScenario && ['default', 'resilience', 'accelerated'].includes(paramScenario) && paramScenario !== selectedScenario) {
      setSelectedScenarioState(paramScenario);
    }
  }, [searchParams, selectedYear, selectedScenario]);

  // Invalidate stale simulation results when selected location changes
  useEffect(() => {
    setSimulationResult(null);
    setExportError(null);
  }, [selectedLocation?.id]);

  const handleExportPdf = async () => {
    if (!selectedLocation?.id || !simulationResult) return;
    setExportingPdf(true);
    setExportError(null);

    const clientState = {
      locationName: selectedLocation.name,
      country: selectedLocation.country,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      currentTemperature: weather?.temperature ?? null,
      currentHumidity: weather?.humidity ?? null,
      currentWindSpeed: weather?.windSpeed ?? null,
      currentDescription: weather?.description ?? null,
      currentAqi: simulationResult.afterSimulation.airQualityIndex ?? null,
      projectedTemperature: simulationResult.afterSimulation.temperature ?? null,
      projectedPrecipitation: null,
      heatRiskLevel: simulationResult.afterSimulation.heatRisk?.level ?? null,
      floodRiskLevel: typeof simulationResult.afterSimulation.floodRisk === 'string'
        ? simulationResult.afterSimulation.floodRisk
        : (simulationResult.afterSimulation.floodRisk as any)?.level ?? null,
      sustainabilityScoreBefore: simulationResult.sustainabilityScore.before ?? null,
      sustainabilityScoreAfter: simulationResult.sustainabilityScore.after ?? null,
      sustainabilityScoreImprovement: simulationResult.sustainabilityScore.improvement ?? null,
      overallRiskScore: simulationResult.afterSimulation.overallRiskScore ?? null,
    };

    try {
      const result = await reportService.generateReport(
        selectedLocation.id,
        simulationResult.simulationId,
        selectedYear,
        clientState
      );

      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.setAttribute('download', `Simulation_Report_${selectedLocation.name.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setExportError(sanitizeErrorMessage(err, 'Failed to export simulation report.'));
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <Sliders size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Scenario Simulator</h2>
            <p className="text-xs text-text-silver">
              Test regional environmental interventions and calculate deterministic outcomes
            </p>
          </div>
        </div>

        {selectedLocation && (
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Scenario Selector */}
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="bg-mid-dark text-text-base text-xs sm:text-sm px-4 py-2 rounded-full outline-none border border-transparent focus:border-light-border cursor-pointer font-sans font-bold uppercase tracking-wider"
            >
              <option value="default">Baseline Scenario</option>
              <option value="resilience">Resilience Plan 2035</option>
              <option value="accelerated">Accelerated Emissions</option>
            </select>

            {/* Year Selector */}
            <div className="flex bg-mid-dark p-1 rounded-full border border-light-border/20">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
                    selectedYear === year
                      ? 'bg-spotify-green text-black'
                      : 'text-text-silver hover:text-text-base'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simulator Content */}
      {locationLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-dark-surface rounded-lg shadow-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
          <span className="text-sm text-text-silver font-sans">Syncing location context...</span>
        </div>
      ) : !selectedLocation ? (
        <EmptyState
          title="No location selected"
          description="Search for a location in the header to configure and run simulations."
          icon={<MapPin size={48} className="text-spotify-green" />}
        />
      ) : (
        <div className="space-y-6">
          <ScenarioSimulator
            locationId={selectedLocation.id}
            year={selectedYear}
            scenario={selectedScenario}
            onSimulationResult={setSimulationResult}
          />

          {/* Outcome Summary and Export Bar when a simulation has been computed */}
          {simulationResult && (
            <Card className="border border-spotify-green/30 bg-dark-surface p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-light-border/20">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-spotify-green/20 rounded-full text-spotify-green">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-title font-bold text-text-base">
                      Simulation Results ({selectedYear})
                    </h3>
                    <p className="text-xs text-text-silver">
                      Simulated impact of {simulationResult.interventions?.length || 0} active intervention(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSaveModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Bookmark size={14} className="text-spotify-green" />
                    <span>Save Report</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {exportingPdf ? (
                      <Loader2 size={14} className="animate-spin text-black" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                  </Button>
                </div>
              </div>

              {exportError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center space-x-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Sustainability Score & Metric Impact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Sustainability Score */}
                <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider">
                    Sustainability Index
                  </span>
                  <div className="my-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-text-silver">
                      {simulationResult.sustainabilityScore.before}
                    </span>
                    <span className="text-sm text-text-silver">→</span>
                    <span className="text-3xl font-bold text-spotify-green">
                      {simulationResult.sustainabilityScore.after}
                    </span>
                    <span className="text-xs text-text-silver/50">/100</span>
                  </div>
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      simulationResult.sustainabilityScore.improvement >= 0
                        ? 'bg-[#1ed760]/20 text-[#1ed760]'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {simulationResult.sustainabilityScore.improvement >= 0 ? '+' : ''}
                    {simulationResult.sustainabilityScore.improvement} Resilience Gain
                  </span>
                </div>

                {/* Simulated Temperature */}
                <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider">
                    Simulated Temperature
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-bold text-text-base">
                      {simulationResult.afterSimulation.temperature !== null
                        ? `${simulationResult.afterSimulation.temperature.toFixed(1)}°C`
                        : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-silver">
                    Heat Risk: {simulationResult.afterSimulation.heatRisk?.level || 'Low'}
                  </span>
                </div>

                {/* Simulated Water Availability */}
                <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider">
                    Water Availability
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-bold text-text-base">
                      {simulationResult.afterSimulation.waterAvailability !== null
                        ? `${simulationResult.afterSimulation.waterAvailability.toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-silver">
                    Flood: {typeof simulationResult.afterSimulation.floodRisk === 'string'
                      ? simulationResult.afterSimulation.floodRisk
                      : (simulationResult.afterSimulation.floodRisk as any)?.level || 'Low'}
                  </span>
                </div>

                {/* Simulated Green Cover & Emissions */}
                <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider">
                    Green Cover / CO2
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-bold text-text-base">
                      {simulationResult.afterSimulation.greenCover !== null
                        ? `${simulationResult.afterSimulation.greenCover.toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-silver">
                    CO2 delta: {simulationResult.afterSimulation.co2Emissions !== null
                      ? `${simulationResult.afterSimulation.co2Emissions > 0 ? '+' : ''}${simulationResult.afterSimulation.co2Emissions}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Save Report Modal */}
          {isSaveModalOpen && selectedLocation && (
            <SaveReportModal
              isOpen={isSaveModalOpen}
              onClose={() => setIsSaveModalOpen(false)}
              location={{
                id: selectedLocation.id,
                name: selectedLocation.name,
                country: selectedLocation.country,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              targetYear={selectedYear}
              scenario={selectedScenario}
              currentClimate={
                weather
                  ? {
                      temperature: weather.temperature,
                      humidity: weather.humidity,
                      windSpeed: weather.windSpeed,
                      description: weather.description,
                    }
                  : null
              }
              riskResults={{
                overallRiskScore: simulationResult?.afterSimulation.overallRiskScore ?? null,
              }}
              simulationResult={
                simulationResult
                  ? {
                      simulationId: simulationResult.simulationId,
                      interventions: simulationResult.interventions || [],
                      sustainabilityScore: simulationResult.sustainabilityScore,
                    }
                  : null
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SimulatorPage;
