import React, { useState, useEffect } from 'react';
import { MapPin, FileText, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { useLocation } from '../../context/LocationContext.js';
import { weatherService } from '../../services/weatherService.js';
import { climateService } from '../../services/climateService.js';
import { riskService } from '../../services/riskService.js';
import { WeatherOverviewCard } from '../../components/dashboard/WeatherOverviewCard.js';
import { ClimateOverviewGrid } from '../../components/dashboard/ClimateOverviewGrid.js';
import { ClimateMap } from '../../components/dashboard/ClimateMap.js';
import { ScenarioSimulator } from '../../components/dashboard/ScenarioSimulator.js';
import { AIAdvisorCard } from '../../components/dashboard/AIAdvisorCard.js';
import { WeatherData, ClimateMetrics, SimulationResult } from '../../types/domain.js';
import { reportService } from '../../services/reportService.js';

export const DashboardPage: React.FC = () => {
  const { selectedLocation, loading: locationLoading } = useLocation();
  const [selectedYear, setSelectedYear] = useState<number>(2035);
  const [selectedScenario, setSelectedScenario] = useState<string>('default');

  // Weather States
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Climate Metrics States
  const [climateMetrics, setClimateMetrics] = useState<ClimateMetrics | null>(null);
  const [climateLoading, setClimateLoading] = useState<boolean>(false);
  const [climateError, setClimateError] = useState<string | null>(null);

  // Flood Risk States
  const [floodRiskLevel, setFloodRiskLevel] = useState<string | null>(null);
  const [floodRiskLoading, setFloodRiskLoading] = useState<boolean>(false);
  const [floodRiskError, setFloodRiskError] = useState<string | null>(null);

  // Current/Observed Risk States (for Map Popup)
  const [currentHeatRiskLevel, setCurrentHeatRiskLevel] = useState<string | null>(null);
  const [currentFloodRiskLevel, setCurrentFloodRiskLevel] = useState<string | null>(null);

  // Historical Climate States
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState<boolean>(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  // Simulation State
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Report States
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const years = [2030, 2035, 2040, 2050];

  // Reset states immediately when location changes or is cleared
  useEffect(() => {
    setWeather(null);
    setWeatherError(null);
    setClimateMetrics(null);
    setClimateError(null);
    setFloodRiskLevel(null);
    setFloodRiskError(null);
    setCurrentHeatRiskLevel(null);
    setCurrentFloodRiskLevel(null);
    setHistoricalData([]);
    setProjectionData([]);
    setHistoricalError(null);
    setSimulationResult(null);
    setReportError(null);
    setReportGenerating(false);
  }, [selectedLocation]);

  const fetchWeatherData = async () => {
    if (!selectedLocation?.latitude || !selectedLocation?.longitude) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await weatherService.getCurrentWeather(
        selectedLocation.latitude,
        selectedLocation.longitude
      );
      setWeather(data);
    } catch (err: any) {
      setWeatherError(err.message || 'Weather data unavailable');
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchClimateData = async () => {
    if (!selectedLocation?.id) return;
    setClimateLoading(true);
    setClimateError(null);
    try {
      const data = await climateService.getClimateOverview(
        selectedLocation.id,
        selectedYear
      );
      setClimateMetrics(data.metrics);
    } catch (err: any) {
      setClimateError(err.message || 'Climate data unavailable');
    } finally {
      setClimateLoading(false);
    }
  };

  const fetchFloodRiskData = async () => {
    if (!selectedLocation?.id) return;
    setFloodRiskLoading(true);
    setFloodRiskError(null);
    try {
      const data = await riskService.getRiskSummary(
        selectedLocation.id,
        'flood',
        selectedYear
      );
      setFloodRiskLevel(data.level);
    } catch (err: any) {
      setFloodRiskError(err.message || 'Risk data unavailable');
    } finally {
      setFloodRiskLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    if (!selectedLocation?.id) return;
    setHistoricalLoading(true);
    setHistoricalError(null);
    try {
      const data = await climateService.getHistoricalClimate(selectedLocation.id);
      setHistoricalData(data.history);
    } catch (err: any) {
      setHistoricalError(err.message || 'Historical climate data unavailable');
    }

    // Also fetch projection data for the chart
    try {
      const predictions = await climateService.getFuturePredictions(selectedLocation.id);
      if (predictions.projections && predictions.projections.length > 0) {
        setProjectionData(
          predictions.projections.map((p: any) => ({
            year: p.year,
            temperature: p.metrics?.temperature ?? null,
            precipitation: p.metrics?.precipitation ?? null,
            isProjected: true,
          }))
        );
      }
    } catch (predErr: any) {
      console.warn('Projection data unavailable for chart:', predErr.message);
      setProjectionData([]);
    }

    setHistoricalLoading(false);
  };

  const fetchCurrentRiskData = async () => {
    if (!selectedLocation?.id) return;
    try {
      // Fetch observed current risks using year 2026
      const heatData = await riskService.getRiskSummary(
        selectedLocation.id,
        'temperature',
        2026
      );
      setCurrentHeatRiskLevel(heatData.level);

      const floodData = await riskService.getRiskSummary(
        selectedLocation.id,
        'flood',
        2026
      );
      setCurrentFloodRiskLevel(floodData.level);
    } catch (err: any) {
      console.error('Current risk data unavailable:', err.message || err);
      setCurrentHeatRiskLevel(null);
      setCurrentFloodRiskLevel(null);
    }
  };

  // Fetch weather when location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchWeatherData();
      fetchHistoricalData();
      fetchCurrentRiskData();
    }
  }, [selectedLocation]);

  // Fetch climate and risk data when location or year changes
  useEffect(() => {
    if (selectedLocation) {
      fetchClimateData();
      fetchFloodRiskData();
    }
  }, [selectedLocation, selectedYear]);

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
      projectedPrecipitation: projectionData.length > 0 ? projectionData[projectionData.length - 1]?.precipitation ?? null : null,
      heatRiskLevel: currentHeatRiskLevel,
      floodRiskLevel: floodRiskLevel || currentFloodRiskLevel,
      sustainabilityScoreBefore: simulationResult?.sustainabilityScore.before ?? null,
      sustainabilityScoreAfter: simulationResult?.sustainabilityScore.after ?? null,
      sustainabilityScoreImprovement: simulationResult?.sustainabilityScore.improvement ?? null,
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
      setReportError(err.message || 'Failed to generate report.');
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
                {[selectedLocation?.name, selectedLocation?.city, selectedLocation?.region, selectedLocation?.country].filter(Boolean).filter((val, idx, self) => self.indexOf(val) === idx).join(', ')}
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
        <EmptyState
          title="No location selected"
          description="Search for a location to begin."
          icon={<MapPin size={48} className="text-spotify-green" />}
        />
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
                heatRiskLevel={currentHeatRiskLevel}
                floodRiskLevel={currentFloodRiskLevel}
                metrics={climateMetrics}
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
                  metrics={climateMetrics}
                  floodRiskLevel={floodRiskLevel}
                  loading={climateLoading}
                  error={climateError}
                  floodRiskLoading={floodRiskLoading}
                  floodRiskError={floodRiskError}
                />
              </Card>
            </div>
          </div>

          {/* Secondary Dashboard Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Climate Timeline (Historical + Projected) */}
            <Card className="flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-spotify-green" />
                  <span>Climate Timeline</span>
                </h3>
                <div className="flex gap-1">
                  <span className="text-[10px] text-black bg-spotify-green px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    HISTORICAL
                  </span>
                  {projectionData.length > 0 && (
                    <span className="text-[10px] text-black bg-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      PROJECTED
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center bg-mid-dark rounded-lg p-4 min-h-[220px]">
                {historicalLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
                    <span className="text-xs text-text-silver font-sans">Loading historical climate data...</span>
                  </div>
                ) : historicalError ? (
                  <div className="text-center p-4">
                    <p className="text-xs text-red-500 mb-2">{historicalError}</p>
                    <Button variant="outline" size="sm" onClick={fetchHistoricalData}>
                      Retry
                    </Button>
                  </div>
                ) : historicalData.length === 0 && projectionData.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-xs text-text-silver italic">No climate data available for this location.</p>
                  </div>
                ) : (
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          ...historicalData.map((d: any) => ({
                            ...d,
                            projectedTemp: d.year === 2024 ? d.temperature : null,
                            projectedPrecip: d.year === 2024 ? d.precipitation : null,
                          })),
                          ...projectionData.map((d: any) => ({
                            year: d.year,
                            temperature: null,
                            precipitation: null,
                            projectedTemp: d.temperature,
                            projectedPrecip: d.precipitation,
                          })),
                        ].sort((a: any, b: any) => a.year - b.year)}
                        margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
                        <ReferenceLine
                          yAxisId="left"
                          x={2024}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{ value: 'NOW', fill: '#ef4444', fontSize: 10, position: 'top' }}
                        />
                        <XAxis
                          dataKey="year"
                          stroke="#b3b3b3"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#1DB954"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          unit="°C"
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#3B82F6"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          unit=" mm"
                        />
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
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconSize={10}
                          wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }}
                        />
                        {/* Historical lines (solid) */}
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="temperature"
                          name="Avg Temperature (Historical)"
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
                          name="Rainfall (Historical)"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                        {/* Projected lines (dashed) */}
                        {projectionData.length > 0 && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="projectedTemp"
                            name="Avg Temperature (Projected)"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={{ r: 4, strokeWidth: 1, fill: '#F59E0B' }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                          />
                        )}
                        {projectionData.length > 0 && (
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
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>

            {/* Scenario Simulator */}
            <ScenarioSimulator
              locationId={selectedLocation?.id}
              year={selectedYear}
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
              simulationResult={simulationResult}
            />

            {/* Export Report Card */}
            <Card className="flex flex-col justify-between min-h-[200px]">
              <h3 className="text-base font-title font-bold text-text-base mb-2 flex items-center gap-2">
                <FileText size={18} className="text-spotify-green" />
                <span>Export Report</span>
              </h3>
              <p className="text-xs text-text-silver leading-relaxed flex-grow">
                Download a comprehensive PDF climate risk and intervention report for the selected location.
              </p>
              {reportError && (
                <p className="text-xs text-red-500 mb-2 font-semibold">
                  {reportError}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={handleGenerateReport}
                disabled={reportGenerating || !selectedLocation}
              >
                {reportGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
export default DashboardPage;
