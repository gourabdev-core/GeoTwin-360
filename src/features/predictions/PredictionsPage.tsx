import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Info, Calendar, Database, ShieldAlert, Cpu } from 'lucide-react';
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
import { useLocation } from '../../context/LocationContext.js';
import { climateService } from '../../services/climateService.js';

export const PredictionsPage: React.FC = () => {
  const { selectedLocation } = useLocation();
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch historical observations
      const histData = await climateService.getHistoricalClimate(selectedLocation.id);
      setHistoricalData(histData.history || []);

      // 2. Fetch projections
      const predData = await climateService.getFuturePredictions(selectedLocation.id);
      setProjectionData(predData.projections || []);
      setModelInfo(predData.model || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load prediction data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchData();
    } else {
      setHistoricalData([]);
      setProjectionData([]);
      setModelInfo(null);
    }
  }, [selectedLocation]);

  if (!selectedLocation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">AI Predictions & Projections</h2>
            <p className="text-xs text-text-silver">Long-term modelled climate forecasts up to 2050</p>
          </div>
        </div>

        <EmptyState
          title="No location selected"
          description="Search for a location to view climate projections."
          icon={<TrendingUp size={48} className="text-spotify-green" />}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-spotify-green"></div>
        <span className="text-sm text-text-silver">Generating projections using historical observations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-dark-surface rounded-lg space-y-4 max-w-md mx-auto mt-12">
        <AlertTriangle size={48} className="text-red-500 mx-auto" />
        <h3 className="text-lg font-title font-bold text-text-base">Projections Unavailable</h3>
        <p className="text-sm text-text-silver leading-relaxed">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="w-full">
          Retry Analysis
        </Button>
      </div>
    );
  }

  // Combine historical and projected data points for timeline chart
  const combinedChartData = [
    ...historicalData.map((d: any) => ({
      year: d.year,
      temperature: d.temperature,
      precipitation: d.precipitation,
      projectedTemp: d.year === 2024 ? d.temperature : null,
      projectedPrecip: d.year === 2024 ? d.precipitation : null,
    })),
    ...projectionData.map((p: any) => ({
      year: p.year,
      temperature: null,
      precipitation: null,
      projectedTemp: p.metrics?.temperature ?? null,
      projectedPrecip: p.metrics?.precipitation ?? null,
    })),
  ].sort((a: any, b: any) => a.year - b.year);

  // Get table rows of projections with metadata
  const tableRows = projectionData.flatMap((p: any) => [
    {
      year: p.year,
      metricName: 'Average Temperature',
      projectedValue: p.metrics?.temperature !== null && p.metrics?.temperature !== undefined
        ? `${Number(p.metrics.temperature).toFixed(1)} °C`
        : 'Unavailable',
      confidence: p.metadata?.tempRSquared !== null && p.metadata?.tempRSquared !== undefined
        ? `${(Number(p.metadata.tempRSquared) * 100).toFixed(1)}% (R²)`
        : 'N/A',
      method: p.metadata?.modelMethod || 'Linear Regression',
      baseline: p.metadata?.baselinePeriod || '2015-2024',
    },
    {
      year: p.year,
      metricName: 'Precipitation',
      projectedValue: p.metrics?.precipitation !== null && p.metrics?.precipitation !== undefined
        ? `${Number(p.metrics.precipitation).toFixed(2)} mm/day`
        : 'Unavailable',
      confidence: p.metadata?.precipRSquared !== null && p.metadata?.precipRSquared !== undefined
        ? `${(Number(p.metadata.precipRSquared) * 100).toFixed(1)}% (R²)`
        : 'N/A',
      method: p.metadata?.modelMethod || 'Linear Regression',
      baseline: p.metadata?.baselinePeriod || '2015-2024',
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">AI Predictions & Projections</h2>
            <p className="text-xs text-text-silver">
              Long-term modelled forecasts for {[selectedLocation.name, selectedLocation.city].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="text-xs font-bold text-black bg-amber-400 px-3 py-1.5 rounded-full uppercase tracking-wider">
          Projections Live
        </div>
      </div>

      {/* Grid: Chart + Model Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <Card className="lg:col-span-2 flex flex-col min-h-[380px]">
          <h3 className="text-base font-title font-bold text-text-base mb-4">Climate Trend Timeline (2015 - 2050)</h3>
          <div className="flex-grow flex items-center justify-center bg-mid-dark rounded-lg p-4 min-h-[260px]">
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
                  <ReferenceLine
                    yAxisId="left"
                    x={2024}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: 'NOW', fill: '#ef4444', fontSize: 10, position: 'top' }}
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

        {/* Model Specifications */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-base font-title font-bold text-text-base mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-spotify-green" />
              <span>Model Specifications</span>
            </h3>
            <div className="space-y-4">
              <div className="bg-mid-dark p-3 rounded-lg">
                <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold">Model Engine</span>
                <span className="text-sm font-bold text-text-base mt-0.5 block">{modelInfo?.name || 'GeoTwin 360 Projection'}</span>
              </div>
              <div className="bg-mid-dark p-3 rounded-lg">
                <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold">Methodology</span>
                <span className="text-sm font-bold text-text-base mt-0.5 block">{modelInfo?.method || 'Ordinary Least Squares (OLS) Regression'}</span>
              </div>
              <div className="bg-mid-dark p-3 rounded-lg">
                <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold">Historical Baseline</span>
                <span className="text-sm font-bold text-text-base mt-0.5 block">{modelInfo?.baselinePeriod || '2015 - 2024'}</span>
              </div>
              <div className="bg-mid-dark p-3 rounded-lg">
                <span className="text-[10px] text-text-silver uppercase tracking-wider block font-bold">Primary Data Provider</span>
                <span className="text-sm font-bold text-text-base mt-0.5 block flex items-center gap-1">
                  <Database size={12} className="text-spotify-green" />
                  <span>{modelInfo?.source || 'NASA POWER Climate Adapter'}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-light-border flex items-center gap-2 text-xs text-text-silver">
            <Info size={14} className="text-spotify-green shrink-0" />
            <span>Refreshed automatically on coordinate context shifts.</span>
          </div>
        </Card>
      </div>

      {/* Projection Metadata Table */}
      <Card>
        <h3 className="text-base font-title font-bold text-text-base mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-spotify-green" />
          <span>Detailed Projections Metadata</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-light-border text-text-silver text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Target Year</th>
                <th className="py-3 px-4">Metric/Variable</th>
                <th className="py-3 px-4 text-right">Projected Value</th>
                <th className="py-3 px-4 text-right">Model Fit Confidence</th>
                <th className="py-3 px-4">Methodology</th>
                <th className="py-3 px-4">Baseline period</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx} className="border-b border-light-border/30 hover:bg-mid-dark/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-text-base">{row.year}</td>
                  <td className="py-3 px-4 text-text-silver">{row.metricName}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-spotify-green">{row.projectedValue}</td>
                  <td className="py-3 px-4 text-right font-mono text-text-silver">{row.confidence}</td>
                  <td className="py-3 px-4 text-xs text-text-silver">{row.method}</td>
                  <td className="py-3 px-4 text-xs text-text-silver">{row.baseline}</td>
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
              The climate projections displayed above are mathematically calculated using **Ordinary Least Squares (OLS) Linear Regression** based on 10 years of historical observations (2015-2024) retrieved from the NASA POWER dataset. 
            </p>
            <p className="text-xs text-text-silver leading-relaxed font-bold">
              Important Limitations:
            </p>
            <ul className="list-disc list-inside text-xs text-text-silver space-y-1 leading-relaxed pl-1">
              <li>**Linear Assumptions**: Assumes climate trends progress along a straight linear trajectory. It does not model non-linear accelerations, critical tipping points, or sudden structural climate shifts.</li>
              <li>**GCM Modeling Absence**: This is not a physical General Circulation Model (GCM). It does not compute complex fluid dynamics, radiative forcing, thermodynamic feedback loops, or oceanic/atmospheric circulation.</li>
              <li>**No Emissions Scenarios**: Predictions represent a pure mathematical trend extrapolation. They do not incorporate standardized greenhouse gas concentration pathways (e.g., RCP / SSP scenarios) or international policy targets (e.g. IPCC goals).</li>
              <li>**Baseline Sensitivity**: Fitting regression models over a small 10-year baseline makes projections sensitive to short-term weather anomalies and multi-year climate cycles (like El Niño/La Niña).</li>
            </ul>
            <p className="text-[10px] text-amber-400 italic pt-1">
              Disclaimer: Use these projections solely as illustrative baseline trend extrapolations. They do not constitute scientific forecasts or engineering-grade risk assessments.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PredictionsPage;
