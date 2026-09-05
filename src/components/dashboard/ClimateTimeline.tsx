import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import {
  TrendingUp,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Info,
  Thermometer,
  CloudRain,
  Waves,
  Snowflake,
  Flame,
  LucideIcon,
} from 'lucide-react';
import {
  climateService,
  ClimateTimelineDataPoint,
  ClimateTimelineResponse,
  ClimateIndicatorType,
} from '../../services/climateService.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

interface ClimateTimelineProps {
  locationId?: string;
  scenario?: string;
  className?: string;
}

interface IndicatorConfig {
  id: ClimateIndicatorType;
  label: string;
  icon: LucideIcon;
}

const INDICATOR_TABS: IndicatorConfig[] = [
  { id: 'temperature', label: 'Temperature Anomaly', icon: Thermometer },
  { id: 'precipitation', label: 'Precipitation', icon: CloudRain },
  { id: 'sea_level', label: 'Sea Level', icon: Waves },
  { id: 'sea_ice', label: 'Arctic Sea Ice', icon: Snowflake },
  { id: 'extreme_heat', label: 'Extreme Heat Days', icon: Flame },
];

export const ClimateTimeline: React.FC<ClimateTimelineProps> = ({
  locationId,
  scenario = 'default',
  className = '',
}) => {
  const [activeIndicator, setActiveIndicator] = useState<ClimateIndicatorType>('temperature');
  const [data, setData] = useState<ClimateTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(() => {
    setLoading(true);
    setError(null);
    climateService
      .getClimateTimeline(locationId, scenario, activeIndicator)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(sanitizeErrorMessage(err, `Unable to load climate timeline for ${activeIndicator}.`));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [locationId, scenario, activeIndicator]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Transform data for charting with clear separation between Observed, YTD, and Projected
  const chartData = useMemo(() => {
    if (!data?.combinedTimeline || data.combinedTimeline.length === 0) return [];

    const pt2025 = data.combinedTimeline.find((p) => p.year === 2025);
    const pt2026 = data.combinedTimeline.find((p) => p.year === 2026);
    const val2025 = pt2025?.value ?? null;
    const val2026 = pt2026?.value ?? null;

    return data.combinedTimeline
      .map((pt: ClimateTimelineDataPoint) => {
        const isObserved = pt.status === 'observed';
        const isProjected = pt.status === 'projected';

        return {
          year: pt.year,
          rawPoint: pt,
          // Solid green for completed historical observations (2015 - 2025)
          observedValue: isObserved ? pt.value : null,
          // Cyan bridge segment for 2026 YTD (bridges 2025 observed to 2026 YTD)
          ytdValue: pt.year === 2025 ? val2025 : pt.year === 2026 ? val2026 : null,
          // Dashed amber for future scenario projections (bridges from 2026 YTD forward)
          projectedValue: pt.year === 2026 ? val2026 : isProjected ? (pt.projectedValue ?? pt.value) : null,
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [data]);

  const hasProjections = useMemo(() => {
    return Boolean(data?.projections && data.projections.length > 0);
  }, [data]);

  const unit = data?.unit || '°C';
  const scopeLabel = data?.scope ? (data.scope.charAt(0).toUpperCase() + data.scope.slice(1)) : 'Global';

  return (
    <Card className={`flex flex-col min-h-[360px] ${className}`}>
      {/* Header with Title and Scope Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-title font-bold text-text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-spotify-green" aria-hidden="true" />
            <span>Climate Timeline</span>
          </h3>
          <p className="text-xs text-text-silver mt-0.5">
            {data?.description || 'Historical observations and scenario-driven multi-indicator projections.'}
          </p>
        </div>

        {/* Scope and Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[10px] text-text-base bg-dark-card border border-light-border/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Scope: {scopeLabel}
          </span>
          <span className="text-[10px] text-black bg-spotify-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Observed (2015–2025)
          </span>
          <span className="text-[10px] text-black bg-sky-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            YTD (2026)
          </span>
          {hasProjections && (
            <span className="text-[10px] text-black bg-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Projected ({scenario})
            </span>
          )}
        </div>
      </div>

      {/* Multi-Indicator Switcher Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-thin border-b border-light-border/10">
        {INDICATOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeIndicator === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveIndicator(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-spotify-green ${
                isActive
                  ? 'bg-spotify-green text-black font-bold shadow-sm'
                  : 'bg-mid-dark text-text-silver hover:text-text-base hover:bg-dark-card'
              }`}
              aria-pressed={isActive}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart Canvas / States */}
      <div className="flex-grow flex items-center justify-center bg-mid-dark rounded-lg p-3 min-h-[220px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-8" role="status">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
            <span className="text-xs text-text-silver font-sans">
              Loading {INDICATOR_TABS.find((t) => t.id === activeIndicator)?.label || 'indicator'} telemetry...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <AlertCircle size={28} className="text-red-400 mb-2" aria-hidden="true" />
            <p className="text-xs text-red-400 mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTimeline}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={12} aria-hidden="true" />
              <span>Retry</span>
            </Button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center p-6">
            <Info size={24} className="text-text-silver mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-text-silver italic">
              Data unavailable for {activeIndicator}.
            </p>
          </div>
        ) : (
          <div className="w-full h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />

                {/* Year 2026 Reference Marker */}
                <ReferenceLine
                  yAxisId="left"
                  x={2026}
                  stroke="#38bdf8"
                  strokeDasharray="3 3"
                  label={{
                    value: '2026 (YTD)',
                    fill: '#38bdf8',
                    fontSize: 10,
                    position: 'top',
                  }}
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
                  unit={` ${unit}`}
                  domain={['auto', 'auto']}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'sans-serif',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  formatter={(val: any, _name: any, item: any) => {
                    if (val === null || val === undefined || isNaN(Number(val))) return ['Data unavailable', ''];
                    const rawPt = item?.payload?.rawPoint as ClimateTimelineDataPoint | undefined;
                    const num = Number(val);
                    const formattedVal = (activeIndicator === 'temperature' && num > 0)
                      ? `+${num.toFixed(2)} ${unit}`
                      : `${num.toFixed(1)} ${unit}`;

                    if (rawPt?.status === 'year_to_date') {
                      return [
                        formattedVal,
                        `2026 Year-to-Date (${data?.source || 'Observed'} · Incomplete)`,
                      ];
                    }
                    if (rawPt?.status === 'projected') {
                      return [
                        formattedVal,
                        `Projected (${scenario.toUpperCase()})`,
                      ];
                    }
                    return [
                      formattedVal,
                      `Observed Annual (${data?.source || 'Authoritative Record'})`,
                    ];
                  }}
                />

                <Legend
                  verticalAlign="top"
                  height={32}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }}
                />

                {/* 1. Completed Historical Observations (solid green) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="observedValue"
                  name={`Observed Annual (${unit})`}
                  stroke="#1DB954"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1, fill: '#1DB954' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />

                {/* 2. 2026 Incomplete Year-to-Date (cyan line segment) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ytdValue"
                  name="2026 Year-to-Date (Incomplete)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 5, strokeWidth: 1.5, fill: '#38bdf8' }}
                  activeDot={{ r: 7 }}
                  connectNulls={true}
                />

                {/* 3. Future Scenario Projections (dashed amber line) */}
                {hasProjections && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="projectedValue"
                    name={`Projected (${scenario.toUpperCase()})`}
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 4, strokeWidth: 1, fill: '#F59E0B' }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Source Footer & Scientific Provenance */}
      <div className="mt-3 pt-2.5 border-t border-[#282828] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-text-silver">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-text-base">Source:</span>
          <span>{data?.source || 'Authoritative Earth Observation'}</span>
          {data?.sourceUrl && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-spotify-green hover:underline inline-flex items-center gap-0.5 focus:outline-none focus:ring-1 focus:ring-spotify-green rounded"
              aria-label={`${data.source} dataset documentation (opens in new tab)`}
            >
              <span>Documentation</span>
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          )}
          <span className="text-[#535353]">|</span>
          <span className="text-sky-300 font-medium">
            {data?.currentYearStatus || '2026: Year-to-date observation'}
          </span>
        </div>

        <div className="text-[10px] text-text-silver/80">
          Baseline: {data?.baseline || 'Authoritative Baseline'}
        </div>
      </div>
    </Card>
  );
};
