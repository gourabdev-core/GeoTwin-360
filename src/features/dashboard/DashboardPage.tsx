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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-5 bg-[#091614] border border-white/[0.08] rounded-2xl shadow-medium gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-[#0d1b18] border border-white/[0.08] rounded-xl text-[#32f26b] shadow-subtle flex-shrink-0">
            <MapPin size={22} />
          </div>
          {selectedLocation ? (
            <div>
              <h2 className="text-xl font-title font-bold text-[#f5fff8] tracking-tight">
                {selectedLocation.displayName || formatLocationName(selectedLocation)}
              </h2>
              <p className="text-xs text-[#8ea39a] font-sans mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#19d9c5]/90 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {selectedLocation?.latitude !== undefined && selectedLocation?.latitude !== null ? Math.abs(selectedLocation.latitude).toFixed(4) : '0.0000'}° {selectedLocation?.latitude !== undefined && selectedLocation?.latitude >= 0 ? 'N' : 'S'},{' '}
                  {selectedLocation?.longitude !== undefined && selectedLocation?.longitude !== null ? Math.abs(selectedLocation.longitude).toFixed(4) : '0.0000'}° {selectedLocation?.longitude !== undefined && selectedLocation?.longitude >= 0 ? 'E' : 'W'}
                </span>
                <span className="text-[#8ea39a]/60">•</span>
                <span>Real-Time Environmental Twin</span>
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-title font-bold text-[#f5fff8]">No location selected</h2>
              <p className="text-xs text-[#8ea39a] font-sans">Search for any global city or region to begin telemetry.</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          {/* Scenario Selector */}
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            disabled={!selectedLocation}
            className="bg-[#0d1b18] text-[#f5fff8] text-xs font-semibold px-4 py-2.5 rounded-xl outline-none border border-white/[0.08] focus:border-[#32f26b]/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans transition-all shadow-subtle"
          >
            <option value="default">Baseline Scenario</option>
            <option value="resilience">Resilience Plan 2035</option>
            <option value="accelerated">Accelerated Emissions</option>
          </select>

          {/* Year Selector */}
          <div className="flex bg-[#0d1b18] p-1 rounded-xl border border-white/[0.08] shadow-subtle">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                disabled={!selectedLocation}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                  selectedYear === year && selectedLocation
                    ? 'bg-[#32f26b] text-[#07110f] shadow-[0_0_12px_rgba(50,242,107,0.25)]'
                    : 'text-[#8ea39a] hover:text-[#f5fff8] disabled:opacity-40'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {locationLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-[#091614] border border-white/[0.08] rounded-2xl shadow-medium">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-[#32f26b]" />
            <span className="absolute inset-0 rounded-full blur-md bg-[#32f26b]/20 -z-10" />
          </div>
          <span className="text-sm text-[#8ea39a] font-sans">Syncing location context...</span>
        </div>
      ) : !selectedLocation ? (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-[#091614] rounded-2xl min-h-[420px] border border-white/[0.08] shadow-heavy space-y-6">
          <div className="p-4 bg-[#0d1b18] border border-white/[0.08] rounded-2xl text-[#32f26b] shadow-[0_0_24px_rgba(50,242,107,0.15)]">
            <Compass size={44} />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-2xl font-title font-bold text-[#f5fff8] tracking-tight">
              Search a location to explore its digital twin
            </h3>
            <p className="text-sm text-[#8ea39a] leading-relaxed">
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
              className="flex-1 bg-[#0d1b18] text-[#f5fff8] px-4 py-3 rounded-xl border border-white/[0.08] focus:border-[#32f26b]/50 focus:shadow-[0_0_16px_rgba(50,242,107,0.15)] outline-none text-sm font-sans transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={inlineLoading || inlineQuery.trim().length < 2}
              className="shrink-0"
            >
              {inlineLoading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
            </Button>
          </form>

          {inlineError && (
            <p className="text-xs text-[#f87171]">{inlineError}</p>
          )}

          {inlineResults.length > 0 && (
            <div className="w-full max-w-md bg-[#0d1b18] border border-white/[0.08] rounded-xl text-left overflow-hidden divide-y divide-white/[0.04] shadow-heavy">
              {inlineResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectLocation(res)}
                  className="w-full px-4 py-3 text-left hover:bg-[#10221e] transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-semibold text-[#f5fff8]">{res.displayName || res.name}</span>
                  <span className="text-[#19d9c5]/80 font-mono">{res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Select Location Chips */}
          <div className="pt-2">
            <span className="block text-[11px] text-[#8ea39a] uppercase tracking-wider font-semibold mb-3">
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
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#0d1b18] border border-white/[0.08] text-[#8ea39a] hover:text-[#f5fff8] hover:border-[#32f26b]/40 hover:bg-[#10221e] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 shadow-subtle"
                >
                  <MapPin size={12} className="text-[#32f26b]" />
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
              <h3 className="text-base font-title font-bold text-[#f5fff8] mb-2">Sustainability Index</h3>
              <div className="flex-grow flex flex-col justify-center items-center py-2">
                {simulationResult ? (
                  <div className="w-full space-y-3.5">
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <span className="text-[10px] text-[#8ea39a] block font-sans font-bold uppercase tracking-wider mb-1">Baseline</span>
                        <span className="text-2xl font-bold text-[#8ea39a]">{simulationResult.sustainabilityScore.before}</span>
                        <span className="text-[10px] text-[#8ea39a]/50 font-bold block">/100</span>
                      </div>
                      <span className="text-xl text-[#8ea39a]/40">→</span>
                      <div className="text-center">
                        <span className="text-[10px] text-[#32f26b] block font-sans font-bold uppercase tracking-wider mb-1">Resilient</span>
                        <span className="text-3xl font-bold text-[#f5fff8] font-title">{simulationResult.sustainabilityScore.after}</span>
                        <span className="text-[10px] text-[#32f26b]/60 font-bold block">/100</span>
                      </div>
                    </div>
                    <div className="text-center pt-1">
                      <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
                        simulationResult.sustainabilityScore.improvement >= 0
                          ? 'bg-[#32f26b]/15 text-[#32f26b] border-[#32f26b]/30 shadow-[0_0_10px_rgba(50,242,107,0.15)]'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {simulationResult.sustainabilityScore.improvement >= 0 ? '+' : ''}
                        {simulationResult.sustainabilityScore.improvement} Resilience Score Change
                      </span>
                    </div>
                  </div>
                ) : baselineSustainabilityScore !== null ? (
                  <div className="text-center space-y-1.5">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-4xl font-bold text-[#f5fff8] font-title">{baselineSustainabilityScore}</span>
                      <span className="text-xs text-[#8ea39a] font-bold">/100</span>
                    </div>
                    <span className="text-xs text-[#c7d4cf] block font-sans font-medium">
                      Baseline Sustainability Index
                    </span>
                    <span className="text-[11px] text-[#8ea39a]/70 block">
                      Run scenario simulator below to evaluate intervention impact
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <span className="text-3xl font-bold text-[#f5fff8]">--</span>
                    <span className="text-xs text-[#8ea39a] block">Score unavailable</span>
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
                  <h3 className="text-base font-title font-bold text-[#f5fff8] flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-[#32f26b]/10 text-[#32f26b]">
                      <FileText size={16} />
                    </div>
                    <span>Climate Report</span>
                  </h3>
                  <Link
                    to="/reports"
                    className="text-xs text-[#32f26b] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>All Reports</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <p className="text-xs text-[#8ea39a] leading-relaxed">
                  Save this scenario and risk intelligence to your account or export a complete PDF summary.
                </p>

                {/* Recent Saved Reports list */}
                <div className="mt-3 pt-3 border-t border-white/[0.07]">
                  <div className="text-[11px] font-bold text-[#8ea39a] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={11} />
                    <span>Recent Saved Reports</span>
                  </div>
                  {reportsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-[#8ea39a]">
                      <Loader2 size={13} className="animate-spin text-[#32f26b]" />
                      <span>Loading saved reports...</span>
                    </div>
                  ) : reportsError ? (
                    <p className="text-xs text-[#f87171] py-1">{reportsError}</p>
                  ) : savedReports.length === 0 ? (
                    <p className="text-xs text-[#8ea39a]/60 italic py-1">No saved reports yet.</p>
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
                            className="flex items-center justify-between p-2 rounded-xl bg-[#0d1b18] hover:bg-[#10221e] border border-white/[0.06] text-xs transition-colors"
                          >
                            <div className="truncate mr-2">
                              <span className="font-semibold text-[#f5fff8] block truncate">
                                {rep.title || 'Climate Assessment Report'}
                              </span>
                              <span className="text-[10px] text-[#8ea39a]">
                                {locName} {targetYr ? `• ${targetYr}` : ''} {scenName ? `(${scenName})` : ''}
                              </span>
                            </div>
                            {rep.file_url && (
                              <a
                                href={rep.file_url}
                                download={`Report_${locName.replace(/\s+/g, '_')}.pdf`}
                                className="text-[#32f26b] hover:text-white p-1 rounded transition-colors flex-shrink-0"
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
                <p className="text-xs text-[#f87171] my-2 font-semibold">
                  {reportError}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
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
