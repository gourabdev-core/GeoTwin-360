import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, FileText, Compass, Loader2, Bookmark, Download, Clock, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { useLocation } from '../../context/LocationContext.js';
import { useWeather } from '../../context/WeatherContext.js';
import { climateService } from '../../services/climateService.js';
import { riskService } from '../../services/riskService.js';
import { solutionService } from '../../services/solutionService.js';
import { reportService } from '../../services/reportService.js';
import { LocationService } from '../../services/locationService.js';
import { WeatherOverviewCard } from '../../components/dashboard/WeatherOverviewCard.js';
import { ClimateOverviewGrid } from '../../components/dashboard/ClimateOverviewGrid.js';
import { ClimateMap } from '../../components/dashboard/ClimateMap.js';
import { ClimateTimeline } from '../../components/dashboard/ClimateTimeline.js';
import { ScenarioSimulator } from '../../components/dashboard/ScenarioSimulator.js';
import { AIAdvisorCard } from '../../components/dashboard/AIAdvisorCard.js';
import { ClimateMetrics, SimulationResult } from '../../types/domain.js';
import { ResilienceSolution } from '../../types/solution.js';
import { DatabaseSavedReport } from '../../types/database.js';
import { SaveReportModal } from '../reports/SaveReportModal.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';
import { usePreferences } from '../../context/PreferencesContext.js';

export const DashboardPage: React.FC = () => {
  const { preferences } = usePreferences();
  const { selectedLocation, loading: locationLoading, selectLocation, formatLocationName } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Synchronize year and scenario with URL search params and local storage for refresh persistence
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
    return preferences.defaultTargetYear || 2035;
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
    const defaultScn = preferences.defaultScenario === 'baseline' ? 'default' : preferences.defaultScenario;
    return defaultScn || 'default';
  });

  const setSelectedYear = useCallback((year: number) => {
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
  }, [setSearchParams]);

  const setSelectedScenario = useCallback((scenario: string) => {
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
  }, [setSearchParams]);

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

  // Inline search state for empty state
  const [inlineQuery, setInlineQuery] = useState<string>('');
  const [inlineLoading, setInlineLoading] = useState<boolean>(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineResults, setInlineResults] = useState<any[]>([]);

  // Weather State from unified WeatherContext (automatically fetches when selectedLocation changes)
  const { 
    weather, 
    loading: weatherLoading, 
    error: weatherError, 
    refreshWeather: fetchWeatherData 
  } = useWeather();

  // Climate Metrics States
  const [climateMetrics, setClimateMetrics] = useState<ClimateMetrics | null>(null);
  const [climateLoading, setClimateLoading] = useState<boolean>(false);
  const [climateError, setClimateError] = useState<string | null>(null);

  // Risk States
  const [floodRiskLevel, setFloodRiskLevel] = useState<string | null>(null);
  const [floodRiskLoading, setFloodRiskLoading] = useState<boolean>(false);
  const [floodRiskError, setFloodRiskError] = useState<string | null>(null);

  // Current/Observed Risk States (for Map Popup)
  const [currentHeatRiskLevel, setCurrentHeatRiskLevel] = useState<string | null>(null);
  const [currentFloodRiskLevel, setCurrentFloodRiskLevel] = useState<string | null>(null);

  // Resilience Solutions
  const [resilienceSolutions, setResilienceSolutions] = useState<ResilienceSolution[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState<boolean>(false);
  const [solutionsError, setSolutionsError] = useState<string | null>(null);

  // Saved Reports State
  const [savedReports, setSavedReports] = useState<DatabaseSavedReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Simulation State
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Report States
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSaveReportModalOpen, setIsSaveReportModalOpen] = useState<boolean>(false);

  const years = [2030, 2035, 2040, 2050];
  const currentRequestIdRef = useRef<number>(0);

  // Fetch recent saved reports from shared report service
  const fetchSavedReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const reports = await reportService.getSavedReports();
      setSavedReports(reports || []);
    } catch (err: any) {
      setReportsError(sanitizeErrorMessage(err, 'Failed to load saved reports.'));
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedReports();
  }, [fetchSavedReports]);

  // Reset states immediately when location changes or is cleared to prevent stale flashes
  useEffect(() => {
    currentRequestIdRef.current++;
    setClimateMetrics(null);
    setClimateError(null);
    setFloodRiskLevel(null);
    setFloodRiskError(null);
    setCurrentHeatRiskLevel(null);
    setCurrentFloodRiskLevel(null);
    setResilienceSolutions([]);
    setSolutionsError(null);
    setSimulationResult(null);
    setReportError(null);
    setReportGenerating(false);
  }, [selectedLocation?.id, selectedLocation?.latitude, selectedLocation?.longitude]);

  // 1. Fetch location-specific baseline data (Observed current risks)
  // Only runs when selectedLocation changes, preventing duplicate requests
  useEffect(() => {
    if (!selectedLocation?.id) return;
    const reqId = currentRequestIdRef.current;
    const locId = selectedLocation.id;

    // Current baseline risks (year 2026)
    riskService.getAllRisks(locId, 2026, 'default')
      .then((data) => {
        if (reqId === currentRequestIdRef.current && data?.risks) {
          setCurrentHeatRiskLevel(data.risks.temperature?.level || null);
          setCurrentFloodRiskLevel(data.risks.flood?.level || null);
        }
      })
      .catch(() => {
        if (reqId === currentRequestIdRef.current) {
          setCurrentHeatRiskLevel(null);
          setCurrentFloodRiskLevel(null);
        }
      });
  }, [selectedLocation?.id, selectedLocation?.latitude, selectedLocation?.longitude]);

  // 2. Fetch scenario & future projection data (Climate Overview, Target Risk, Future Projections, Solutions)
  // Runs when location, year, or scenario changes
  useEffect(() => {
    if (!selectedLocation?.id) return;
    const reqId = currentRequestIdRef.current;
    const locId = selectedLocation.id;
    const yr = selectedYear;
    const scen = selectedScenario;

    // Climate Overview
    setClimateLoading(true);
    setClimateError(null);
    climateService.getClimateOverview(locId, yr, scen)
      .then((data) => {
        if (reqId === currentRequestIdRef.current) {
          setClimateMetrics(data.metrics);
        }
      })
      .catch((err: any) => {
        if (reqId === currentRequestIdRef.current) {
          setClimateError(sanitizeErrorMessage(err, 'Climate data unavailable'));
        }
      })
      .finally(() => {
        if (reqId === currentRequestIdRef.current) {
          setClimateLoading(false);
        }
      });

    // Flood Risk
    setFloodRiskLoading(true);
    setFloodRiskError(null);
    riskService.getRiskSummary(locId, 'flood', yr, scen)
      .then((data) => {
        if (reqId === currentRequestIdRef.current) {
          setFloodRiskLevel(data.level);
        }
      })
      .catch((err: any) => {
        if (reqId === currentRequestIdRef.current) {
          setFloodRiskError(sanitizeErrorMessage(err, 'Risk data unavailable'));
        }
      })
      .finally(() => {
        if (reqId === currentRequestIdRef.current) {
          setFloodRiskLoading(false);
        }
      });

    // Resilience Solutions
    setSolutionsLoading(true);
    setSolutionsError(null);
    solutionService.getSolutions(locId, yr, scen)
      .then((data) => {
        if (reqId === currentRequestIdRef.current) {
          setResilienceSolutions(data.solutions || []);
        }
      })
      .catch((err: any) => {
        if (reqId === currentRequestIdRef.current) {
          setSolutionsError(sanitizeErrorMessage(err, 'Resilience recommendations unavailable'));
        }
      })
      .finally(() => {
        if (reqId === currentRequestIdRef.current) {
          setSolutionsLoading(false);
        }
      });
  }, [selectedLocation?.id, selectedLocation?.latitude, selectedLocation?.longitude, selectedYear, selectedScenario]);

  // Reflect simulation results on climate indicators when a simulation has been run
  const displayedMetrics = useMemo(() => {
    if (!simulationResult || !climateMetrics) return climateMetrics;
    return {
      ...climateMetrics,
      temperature: simulationResult.afterSimulation.temperature !== null ? {
        value: simulationResult.afterSimulation.temperature,
        unit: '°C',
      } : climateMetrics.temperature,
      waterAvailability: simulationResult.afterSimulation.waterAvailability !== null ? {
        value: simulationResult.afterSimulation.waterAvailability,
        unit: '%',
        stressLevel: simulationResult.afterSimulation.waterAvailability > 60 ? 'Low Stress' : simulationResult.afterSimulation.waterAvailability > 40 ? 'Moderate Stress' : 'High Stress',
      } : climateMetrics.waterAvailability,
      airQuality: simulationResult.afterSimulation.airQualityIndex !== null ? {
        aqi: simulationResult.afterSimulation.airQualityIndex,
        category: simulationResult.afterSimulation.airQualityIndex <= 50 ? 'Good' : simulationResult.afterSimulation.airQualityIndex <= 100 ? 'Moderate' : 'Unhealthy (Sensitive)',
      } : climateMetrics.airQuality,
      greenCover: simulationResult.afterSimulation.greenCover !== null ? {
        value: simulationResult.afterSimulation.greenCover,
        unit: '%',
      } : climateMetrics.greenCover,
      co2Emissions: simulationResult.afterSimulation.co2Emissions !== null ? {
        value: `${simulationResult.afterSimulation.co2Emissions > 0 ? '+' : ''}${simulationResult.afterSimulation.co2Emissions}%`,
        unit: 'vs Baseline',
      } : climateMetrics.co2Emissions,
    };
  }, [climateMetrics, simulationResult]);

  const displayedFloodRisk = useMemo(() => {
    if (simulationResult?.afterSimulation.floodRisk && simulationResult.afterSimulation.floodRisk !== 'UNAVAILABLE') {
      const raw = simulationResult.afterSimulation.floodRisk;
      return typeof raw === 'object' && (raw as any).level ? (raw as any).level : String(raw);
    }
    return floodRiskLevel;
  }, [floodRiskLevel, simulationResult]);

  const displayedHeatRisk = useMemo(() => {
    if (simulationResult?.afterSimulation.heatRisk?.level && simulationResult.afterSimulation.heatRisk.level !== 'UNAVAILABLE') {
      return simulationResult.afterSimulation.heatRisk.level;
    }
    return currentHeatRiskLevel;
  }, [currentHeatRiskLevel, simulationResult]);

  // Real data-grounded baseline sustainability score calculated from active location climate metrics
  const baselineSustainabilityScore = useMemo(() => {
    if (!climateMetrics) return null;
    const temp = climateMetrics.temperature?.value ?? 25;
    const aqi = climateMetrics.airQuality?.aqi ?? 80;
    const water = typeof climateMetrics.waterAvailability?.value === 'number'
      ? climateMetrics.waterAvailability.value
      : 55;
    const green = typeof climateMetrics.greenCover?.value === 'number'
      ? climateMetrics.greenCover.value
      : 35;
    return Math.min(90, Math.max(20, Math.round(
      (100 - (temp - 20) * 3) * 0.3 +
      (100 - aqi * 0.4) * 0.25 +
      water * 0.25 +
      green * 0.2
    )));
  }, [climateMetrics]);

  const handleGenerateReport = async () => {
    if (!selectedLocation?.id) return;
    setReportGenerating(true);
    setReportError(null);

    const clientState = {
      locationName: selectedLocation.name,
      country: selectedLocation.country,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      currentTemperature: weather?.temperature ?? null,
      currentHumidity: weather?.humidity ?? null,
      currentWindSpeed: weather?.windSpeed ?? null,
      currentDescription: weather?.description ?? null,
      currentAqi: climateMetrics?.airQuality?.aqi ?? null,
      projectedTemperature: climateMetrics?.temperature?.value ?? null,
      projectedPrecipitation: null,
      heatRiskLevel: displayedHeatRisk,
      floodRiskLevel: displayedFloodRisk || currentFloodRiskLevel,
      sustainabilityScoreBefore: simulationResult?.sustainabilityScore.before ?? null,
      sustainabilityScoreAfter: simulationResult?.sustainabilityScore.after ?? null,
      sustainabilityScoreImprovement: simulationResult?.sustainabilityScore.improvement ?? null,
      overallRiskScore: simulationResult?.afterSimulation.overallRiskScore ?? null,
    };

    try {
      const result = await reportService.generateReport(
        selectedLocation.id,
        simulationResult?.simulationId || undefined,
        selectedYear,
        clientState
      );
      
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.setAttribute('download', `Climate_Report_${selectedLocation.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setReportError(sanitizeErrorMessage(err, 'Failed to generate report.'));
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Location Context Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <MapPin size={24} />
          </div>
          {selectedLocation ? (
            <div>
              <h2 className="text-lg font-title font-bold text-text-base">
                {selectedLocation.displayName || formatLocationName(selectedLocation)}
              </h2>
              <p className="text-xs text-text-silver font-sans">
                {selectedLocation?.latitude !== undefined && selectedLocation?.latitude !== null ? Math.abs(selectedLocation.latitude).toFixed(4) : '0.0000'}° {selectedLocation?.latitude !== undefined && selectedLocation?.latitude >= 0 ? 'N' : 'S'},{' '}
                {selectedLocation?.longitude !== undefined && selectedLocation?.longitude !== null ? Math.abs(selectedLocation.longitude).toFixed(4) : '0.0000'}° {selectedLocation?.longitude !== undefined && selectedLocation?.longitude >= 0 ? 'E' : 'W'}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-title font-bold text-text-base">No location selected</h2>
              <p className="text-xs text-text-silver font-sans">Search for a location to begin.</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          {/* Scenario Selector */}
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            disabled={!selectedLocation}
            className="bg-mid-dark text-text-base text-sm px-4 py-2.5 rounded-full outline-none border border-transparent focus:border-light-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans font-bold uppercase tracking-wider"
          >
            <option value="default">Baseline Scenario</option>
            <option value="resilience">Resilience Plan 2035</option>
            <option value="accelerated">Accelerated Emissions</option>
          </select>

          {/* Year Selector */}
          <div className="flex bg-mid-dark p-1 rounded-full">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                disabled={!selectedLocation}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
                  selectedYear === year && selectedLocation
                    ? 'bg-spotify-green text-black'
                    : 'text-text-silver hover:text-text-base disabled:opacity-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {locationLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-dark-surface rounded-lg shadow-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
          <span className="text-sm text-text-silver font-sans">Syncing location context...</span>
        </div>
      ) : !selectedLocation ? (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-dark-surface rounded-lg min-h-[420px] border border-border-gray/50 shadow-medium space-y-6">
          <div className="p-4 bg-mid-dark rounded-full text-spotify-green">
            <Compass size={44} />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-title font-bold text-text-base">
              Search a location to explore its digital twin
            </h3>
            <p className="text-sm text-text-silver leading-relaxed">
              Search for any city worldwide to load real-time weather, risk intelligence, climate timeline projections, and run interactive scenario simulations.
            </p>
          </div>

          {/* Inline Search Bar */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = inlineQuery.trim();
              if (trimmed.length < 2) {
                setInlineError('Please enter at least 2 characters.');
                return;
              }
              setInlineLoading(true);
              setInlineError(null);
              try {
                const results = await LocationService.searchLocations(trimmed, 5);
                setInlineResults(results);
                if (results.length === 0) {
                  setInlineError('No matching location found');
                }
              } catch (err: any) {
                setInlineError(sanitizeErrorMessage(err, 'Location search temporarily unavailable.'));
                setInlineResults([]);
              } finally {
                setInlineLoading(false);
              }
            }}
            className="w-full max-w-md relative flex gap-2"
          >
            <input
              type="text"
              value={inlineQuery}
              onChange={(e) => {
                setInlineQuery(e.target.value);
                setInlineError(null);
              }}
              placeholder="e.g. Kolkata, Mumbai, London, Tokyo..."
              className="flex-1 bg-mid-dark text-text-base px-4 py-3 rounded-lg border border-border-gray focus:border-spotify-green outline-none text-sm font-sans"
            />
            <Button
              type="submit"
              disabled={inlineLoading || inlineQuery.trim().length < 2}
              className="bg-spotify-green text-black font-bold px-5 hover:bg-spotify-green/90 shrink-0 cursor-pointer"
            >
              {inlineLoading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
            </Button>
          </form>

          {inlineError && (
            <p className="text-xs text-text-negative">{inlineError}</p>
          )}

          {inlineResults.length > 0 && (
            <div className="w-full max-w-md bg-mid-dark border border-border-gray rounded-lg text-left overflow-hidden divide-y divide-border-gray/50">
              {inlineResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectLocation(res)}
                  className="w-full px-4 py-2.5 text-left hover:bg-dark-card transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-bold text-text-base">{res.displayName || res.name}</span>
                  <span className="text-text-silver font-mono">{res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Select Location Chips */}
          <div className="pt-2">
            <span className="block text-[11px] text-text-silver uppercase tracking-wider font-bold mb-3">
              Or explore popular regions:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { name: 'Kolkata', region: 'West Bengal', country: 'India', lat: 22.572646, lng: 88.363895 },
                { name: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.076090, lng: 72.877426 },
                { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.613939, lng: 77.209021 },
                { name: 'London', region: 'England', country: 'United Kingdom', lat: 51.507351, lng: -0.127758 },
                { name: 'Tokyo', region: 'Tokyo', country: 'Japan', lat: 35.676192, lng: 139.650311 },
              ].map((ql) => (
                <button
                  key={ql.name}
                  type="button"
                  onClick={() =>
                    selectLocation({
                      name: ql.name,
                      city: ql.name,
                      region: ql.region,
                      state: ql.region,
                      country: ql.country,
                      latitude: ql.lat,
                      longitude: ql.lng,
                      displayName: `${ql.name}, ${ql.region}, ${ql.country}`,
                    })
                  }
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-mid-dark border border-border-gray/80 text-text-silver hover:text-text-base hover:border-spotify-green/60 hover:bg-dark-card transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin size={12} className="text-spotify-green" />
                  <span>{ql.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Primary Dashboard Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Climate Risk Map */}
            <Card className="lg:col-span-3 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-title font-bold text-text-base">Climate Risk Map</h3>
                <span className="text-xs text-text-silver bg-mid-dark px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                  Digital Twin Layer
                </span>
              </div>
              <ClimateMap
                locationId={selectedLocation?.id || ''}
                latitude={selectedLocation?.latitude ?? 0}
                longitude={selectedLocation?.longitude ?? 0}
                locationName={selectedLocation?.name || 'Unknown'}
                year={selectedYear}
                scenario={selectedScenario}
                heatRiskLevel={displayedHeatRisk}
                floodRiskLevel={displayedFloodRisk}
                metrics={displayedMetrics}
              />
            </Card>

            {/* Climate & Weather Overview (Right column) */}
            <div className="lg:col-span-2 space-y-6">
              <WeatherOverviewCard
                weather={weather}
                loading={weatherLoading}
                error={weatherError}
                onRetry={fetchWeatherData}
              />
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-title font-bold text-text-base">Climate Overview ({selectedYear})</h3>
                  {selectedYear > 2026 && (
                    <span className="text-[10px] text-black bg-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      PROJECTED
                    </span>
                  )}
                </div>
                <ClimateOverviewGrid
                  metrics={displayedMetrics}
                  floodRiskLevel={displayedFloodRisk}
                  heatRiskLevel={displayedHeatRisk}
                  loading={climateLoading}
                  error={climateError}
                  floodRiskLoading={floodRiskLoading}
                  floodRiskError={floodRiskError}
                  year={selectedYear}
                  scenario={selectedScenario}
                />
              </Card>
            </div>
          </div>

          {/* Secondary Dashboard Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Climate Timeline (NASA GISTEMP v4 Historical + Scenario Projections) */}
            <ClimateTimeline
              locationId={selectedLocation?.id}
              scenario={selectedScenario}
            />

            {/* Scenario Simulator */}
            <ScenarioSimulator
              locationId={selectedLocation?.id}
              year={selectedYear}
              scenario={selectedScenario}
              onSimulationResult={setSimulationResult}
            />
          </div>

          {/* Third Dashboard Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sustainability Score */}
            <Card className="flex flex-col min-h-[200px] justify-between">
              <h3 className="text-base font-title font-bold text-text-base mb-2">Sustainability Score</h3>
              <div className="flex-grow flex flex-col justify-center items-center">
                {simulationResult ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <span className="text-xs text-text-silver block font-sans font-bold uppercase tracking-wider mb-1">Before</span>
                        <span className="text-2xl font-bold text-text-silver">{simulationResult.sustainabilityScore.before}</span>
                        <span className="text-xs text-text-silver/50 font-bold block">/100</span>
                      </div>
                      <span className="text-xl text-text-silver">→</span>
                      <div className="text-center">
                        <span className="text-xs text-spotify-green block font-sans font-bold uppercase tracking-wider mb-1">After</span>
                        <span className="text-3xl font-bold text-text-base">{simulationResult.sustainabilityScore.after}</span>
                        <span className="text-xs text-text-silver/50 font-bold block">/100</span>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                        simulationResult.sustainabilityScore.improvement >= 0
                          ? 'bg-[#1ed760]/20 text-[#1ed760]'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {simulationResult.sustainabilityScore.improvement >= 0 ? '+' : ''}
                        {simulationResult.sustainabilityScore.improvement} Resilience Score Change
                      </span>
                    </div>
                  </div>
                ) : baselineSustainabilityScore !== null ? (
                  <div className="text-center space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-text-base">{baselineSustainabilityScore}</span>
                      <span className="text-xs text-text-silver/70 font-bold">/100</span>
                    </div>
                    <span className="text-xs text-text-silver block font-sans font-medium">
                      Baseline Sustainability Index
                    </span>
                    <span className="text-[11px] text-text-silver/60 block mt-1">
                      Run scenario simulator below to evaluate intervention impact
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <span className="text-2xl font-bold text-text-base">--</span>
                    <span className="text-sm text-text-silver block">Score unavailable</span>
                  </div>
                )}
              </div>
            </Card>

            {/* AI Advisor Card */}
            <AIAdvisorCard
              locationId={selectedLocation?.id}
              targetYear={selectedYear}
              scenario={selectedScenario}
              simulationResult={simulationResult}
              resilienceSolutions={resilienceSolutions}
              solutionsLoading={solutionsLoading}
              solutionsError={solutionsError}
            />

            {/* Export & Save Report Card */}
            <Card className="flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
                    <FileText size={18} className="text-spotify-green" />
                    <span>Climate Report</span>
                  </h3>
                  <Link
                    to="/reports"
                    className="text-xs text-spotify-green hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>All Reports</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <p className="text-xs text-text-silver leading-relaxed">
                  Save this scenario and risk intelligence to your account or export a complete PDF summary.
                </p>

                {/* Recent Saved Reports list */}
                <div className="mt-3 pt-3 border-t border-border-gray/50">
                  <div className="text-[11px] font-bold text-text-silver/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={11} />
                    <span>Recent Saved Reports</span>
                  </div>
                  {reportsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-text-silver">
                      <Loader2 size={13} className="animate-spin text-spotify-green" />
                      <span>Loading saved reports...</span>
                    </div>
                  ) : reportsError ? (
                    <p className="text-xs text-red-400 py-1">{reportsError}</p>
                  ) : savedReports.length === 0 ? (
                    <p className="text-xs text-text-silver/60 italic py-1">No saved reports yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
                      {savedReports.slice(0, 2).map((rep) => {
                        const meta = (rep.metadata || {}) as any;
                        const locName = meta.locationName || 'Climate Location';
                        const targetYr = meta.targetYear || '';
                        const scenName = meta.scenario || '';

                        return (
                          <div
                            key={rep.id}
                            className="flex items-center justify-between p-1.5 rounded bg-mid-dark/60 hover:bg-mid-dark border border-border-gray/40 text-xs"
                          >
                            <div className="truncate mr-2">
                              <span className="font-semibold text-text-base block truncate">
                                {rep.title || 'Climate Assessment Report'}
                              </span>
                              <span className="text-[10px] text-text-silver">
                                {locName} {targetYr ? `• ${targetYr}` : ''} {scenName ? `(${scenName})` : ''}
                              </span>
                            </div>
                            {rep.file_url && (
                              <a
                                href={rep.file_url}
                                download={`Report_${locName.replace(/\s+/g, '_')}.pdf`}
                                className="text-spotify-green hover:text-white p-1 rounded transition-colors flex-shrink-0"
                                title="Download saved PDF"
                              >
                                <Download size={13} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {reportError && (
                <p className="text-xs text-red-500 my-2 font-semibold">
                  {reportError}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-grow flex items-center justify-center gap-1.5"
                  onClick={() => setIsSaveReportModalOpen(true)}
                  disabled={!selectedLocation}
                >
                  <Bookmark size={14} />
                  <span>Save Report</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5"
                  onClick={handleGenerateReport}
                  disabled={reportGenerating || !selectedLocation}
                  title="Download PDF directly"
                >
                  <Download size={14} />
                  <span>{reportGenerating ? 'Generating...' : 'Download PDF'}</span>
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Save Report Modal */}
      {selectedLocation && (
        <SaveReportModal
          isOpen={isSaveReportModalOpen}
          onClose={() => setIsSaveReportModalOpen(false)}
          onSaved={fetchSavedReports}
          location={{
            id: selectedLocation.id,
            name: selectedLocation.name,
            country: selectedLocation.country,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }}
          targetYear={selectedYear}
          scenario={selectedScenario}
          currentClimate={weather}
          climateMetrics={displayedMetrics}
          riskResults={{
            heatRiskLevel: displayedHeatRisk,
            floodRiskLevel: displayedFloodRisk || currentFloodRiskLevel,
            overallRiskScore: simulationResult?.afterSimulation.overallRiskScore ?? null,
          }}
          simulationResult={
            simulationResult
              ? {
                  simulationId: simulationResult.simulationId,
                  interventions: [],
                  sustainabilityScore: simulationResult.sustainabilityScore,
                }
              : null
          }
        />
      )}
    </div>
  );
};
export default DashboardPage;
