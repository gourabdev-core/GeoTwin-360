import React, { useState, useId } from 'react';
import {
  Calendar,
  Flame,
  Droplets,
  ShieldCheck,
  Sparkles,
  Sliders,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export type ClimateScenario = 'SSP1-2.6' | 'SSP2-4.5' | 'SSP5-8.5';

interface YearProjection {
  year: number;
  tempAnomaly: number; // in °C above pre-industrial
  heatwaveDays: number;
  floodRiskPercent: number;
  assetDamageBillions: number;
  mitigatedAnomaly: number;
  mitigatedFloodRisk: number;
  mitigatedDamageBillions: number;
}

const PROJECTIONS: Record<ClimateScenario, YearProjection[]> = {
  'SSP1-2.6': [
    { year: 2025, tempAnomaly: 1.25, heatwaveDays: 28, floodRiskPercent: 24, assetDamageBillions: 1.8, mitigatedAnomaly: 1.20, mitigatedFloodRisk: 16, mitigatedDamageBillions: 0.6 },
    { year: 2030, tempAnomaly: 1.45, heatwaveDays: 34, floodRiskPercent: 30, assetDamageBillions: 3.4, mitigatedAnomaly: 1.30, mitigatedFloodRisk: 19, mitigatedDamageBillions: 1.1 },
    { year: 2035, tempAnomaly: 1.60, heatwaveDays: 39, floodRiskPercent: 35, assetDamageBillions: 5.6, mitigatedAnomaly: 1.38, mitigatedFloodRisk: 22, mitigatedDamageBillions: 1.8 },
    { year: 2040, tempAnomaly: 1.70, heatwaveDays: 43, floodRiskPercent: 38, assetDamageBillions: 7.9, mitigatedAnomaly: 1.42, mitigatedFloodRisk: 24, mitigatedDamageBillions: 2.4 },
    { year: 2050, tempAnomaly: 1.75, heatwaveDays: 45, floodRiskPercent: 40, assetDamageBillions: 10.2, mitigatedAnomaly: 1.45, mitigatedFloodRisk: 25, mitigatedDamageBillions: 3.1 },
  ],
  'SSP2-4.5': [
    { year: 2025, tempAnomaly: 1.28, heatwaveDays: 32, floodRiskPercent: 28, assetDamageBillions: 2.2, mitigatedAnomaly: 1.22, mitigatedFloodRisk: 18, mitigatedDamageBillions: 0.7 },
    { year: 2030, tempAnomaly: 1.58, heatwaveDays: 42, floodRiskPercent: 38, assetDamageBillions: 5.8, mitigatedAnomaly: 1.36, mitigatedFloodRisk: 23, mitigatedDamageBillions: 1.9 },
    { year: 2035, tempAnomaly: 1.89, heatwaveDays: 54, floodRiskPercent: 50, assetDamageBillions: 12.4, mitigatedAnomaly: 1.52, mitigatedFloodRisk: 29, mitigatedDamageBillions: 3.8 },
    { year: 2040, tempAnomaly: 2.20, heatwaveDays: 68, floodRiskPercent: 63, assetDamageBillions: 23.5, mitigatedAnomaly: 1.68, mitigatedFloodRisk: 36, mitigatedDamageBillions: 7.2 },
    { year: 2050, tempAnomaly: 2.75, heatwaveDays: 91, floodRiskPercent: 79, assetDamageBillions: 48.2, mitigatedAnomaly: 1.95, mitigatedFloodRisk: 42, mitigatedDamageBillions: 14.6 },
  ],
  'SSP5-8.5': [
    { year: 2025, tempAnomaly: 1.32, heatwaveDays: 36, floodRiskPercent: 32, assetDamageBillions: 2.9, mitigatedAnomaly: 1.24, mitigatedFloodRisk: 20, mitigatedDamageBillions: 0.9 },
    { year: 2030, tempAnomaly: 1.78, heatwaveDays: 52, floodRiskPercent: 47, assetDamageBillions: 9.1, mitigatedAnomaly: 1.48, mitigatedFloodRisk: 28, mitigatedDamageBillions: 2.8 },
    { year: 2035, tempAnomaly: 2.30, heatwaveDays: 71, floodRiskPercent: 65, assetDamageBillions: 22.8, mitigatedAnomaly: 1.79, mitigatedFloodRisk: 39, mitigatedDamageBillions: 7.1 },
    { year: 2040, tempAnomaly: 2.95, heatwaveDays: 98, floodRiskPercent: 82, assetDamageBillions: 46.4, mitigatedAnomaly: 2.15, mitigatedFloodRisk: 48, mitigatedDamageBillions: 14.5 },
    { year: 2050, tempAnomaly: 4.10, heatwaveDays: 142, floodRiskPercent: 96, assetDamageBillions: 98.7, mitigatedAnomaly: 2.80, mitigatedFloodRisk: 58, mitigatedDamageBillions: 31.0 },
  ],
};

const YEARS = [2025, 2030, 2035, 2040, 2050];

export const TimeTravelScrubber: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2035);
  const [scenario, setScenario] = useState<ClimateScenario>('SSP2-4.5');
  const [enableIntervention, setEnableIntervention] = useState<boolean>(true);
  const [activeMetricTab, setActiveMetricTab] = useState<'temperature' | 'flood' | 'damage'>('temperature');
  const scrubberInputId = useId();

  const dataList = PROJECTIONS[scenario];
  const activeData = dataList.find((d) => d.year === selectedYear) || dataList[2];

  // Interpolated values for display
  const displayAnomaly = enableIntervention ? activeData.mitigatedAnomaly : activeData.tempAnomaly;
  const displayFlood = enableIntervention ? activeData.mitigatedFloodRisk : activeData.floodRiskPercent;
  const displayDamage = enableIntervention ? activeData.mitigatedDamageBillions : activeData.assetDamageBillions;
  const avoidedDamage = (activeData.assetDamageBillions - activeData.mitigatedDamageBillions).toFixed(1);

  // SVG Chart Dimensions
  const chartWidth = 560;
  const chartHeight = 150;
  const paddingX = 40;
  const paddingY = 25;

  const minYear = 2025;
  const maxYear = 2050;

  // Metric range mapping
  let maxY = 4.5;
  let unit = '°C';
  if (activeMetricTab === 'flood') {
    maxY = 100;
    unit = '%';
  } else if (activeMetricTab === 'damage') {
    maxY = 100;
    unit = '$B';
  }

  const getPoints = (isMitigated: boolean) => {
    return dataList.map((d) => {
      const x = paddingX + ((d.year - minYear) / (maxYear - minYear)) * (chartWidth - paddingX * 2);
      let val = d.tempAnomaly;
      if (activeMetricTab === 'flood') val = d.floodRiskPercent;
      if (activeMetricTab === 'damage') val = d.assetDamageBillions;

      if (isMitigated) {
        if (activeMetricTab === 'temperature') val = d.mitigatedAnomaly;
        if (activeMetricTab === 'flood') val = d.mitigatedFloodRisk;
        if (activeMetricTab === 'damage') val = d.mitigatedDamageBillions;
      }

      const y = chartHeight - paddingY - (val / maxY) * (chartHeight - paddingY * 2);
      return { x, y, val, year: d.year };
    });
  };

  const baselinePoints = getPoints(false);
  const mitigatedPoints = getPoints(true);

  const baselinePath = baselinePoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  const mitigatedPath = mitigatedPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  // Active year indicator position
  const activeX =
    paddingX + ((selectedYear - minYear) / (maxYear - minYear)) * (chartWidth - paddingX * 2);

  return (
    <div className="relative rounded-2xl bg-[#061019]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(30,215,96,0.12)] p-5 md:p-6 text-white overflow-hidden">
      {/* Laser Top Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#1ed760] to-[#00f2fe]" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-[#1ed760] uppercase">
              INTERACTIVE TIME ENGINE • IPCC AR6 CMIP6
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Decadal Climate Stress Simulator
          </h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Scrub forward in time to simulate cascading urban thermal, hydrologic, and economic hazards.
          </p>
        </div>

        {/* Scenario Selectors */}
        <div className="flex items-center gap-1.5 bg-[#02070c] p-1 rounded-xl border border-white/10 self-start lg:self-center">
          {(['SSP1-2.6', 'SSP2-4.5', 'SSP5-8.5'] as ClimateScenario[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScenario(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                scenario === s
                  ? 'bg-white/15 text-white shadow-sm border border-white/20'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Controls & Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-5">
        {/* Left: Interactive Timeline Slider & Intervention Toggle */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          {/* Year Scrubber Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#00f2fe]" />
              <span className="text-xs font-mono text-[#94a3b8] uppercase">Target Horizon:</span>
              <span className="text-2xl font-extrabold font-mono text-white tracking-wider">
                {selectedYear}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              +{selectedYear - 2025} YRS FROM BASELINE
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-2">
            <label htmlFor={scrubberInputId} className="sr-only">
              Target Year Scrubber ({selectedYear})
            </label>
            <input
              id={scrubberInputId}
              type="range"
              min={2025}
              max={2050}
              step={1}
              value={selectedYear}
              onChange={(e) => {
                const val = Number(e.target.value);
                // Snap to closest key year or allow smooth
                setSelectedYear(val);
              }}
              className="w-full h-2.5 bg-[#0b1b26] rounded-lg appearance-none cursor-pointer accent-[#1ed760] transition-all hover:bg-[#0f2536]"
            />
            {/* Year Tick Marks */}
            <div className="flex justify-between text-[11px] font-mono text-[#64748b] px-1">
              {YEARS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`hover:text-white transition-colors cursor-pointer ${
                    selectedYear === yr ? 'text-[#1ed760] font-bold' : ''
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* GeoTwin AI Intervention Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0b1b26]/90 border border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#1ed760]/10 text-[#1ed760] shrink-0 mt-0.5">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  GeoTwin 360 AI Intervention Suite
                </div>
                <div className="text-[11px] text-[#94a3b8]">
                  Automated sponge corridors, urban canopy cool pockets & permeable sea defenses.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnableIntervention(!enableIntervention)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                enableIntervention
                  ? 'bg-[#1ed760] text-black shadow-[0_0_16px_rgba(30,215,96,0.4)]'
                  : 'bg-white/10 text-[#94a3b8] hover:text-white'
              }`}
            >
              {enableIntervention ? (
                <>
                  <CheckCircle2 size={14} /> ACTIVE (-{avoidedDamage}B RISK)
                </>
              ) : (
                <>
                  <Sliders size={14} /> ENGAGE INTERVENTION
                </>
              )}
            </button>
          </div>

          {/* Metric Tab Selector for Chart */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            <span className="text-[11px] font-mono text-[#64748b]">TELEMETRY TRACE:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveMetricTab('temperature')}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'temperature'
                    ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Thermal Anomaly
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('flood')}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'flood'
                    ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/30'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Flood Hazard
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('damage')}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'damage'
                    ? 'bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Asset Damage ($)
              </button>
            </div>
          </div>
        </div>

        {/* Right: Key Dynamic Indicators */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          {/* Card 1: Thermal Delta */}
          <div className="p-3.5 rounded-xl bg-[#0b1b26]/90 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span className="font-mono">HEAT ANOMALY</span>
              <Flame size={14} className="text-[#f59e0b]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-white">
                +{displayAnomaly.toFixed(2)}°C
              </div>
              <div className="text-[10.5px] text-[#94a3b8]">
                {enableIntervention ? (
                  <span className="text-[#1ed760] font-semibold">
                    -{(activeData.tempAnomaly - activeData.mitigatedAnomaly).toFixed(2)}°C cooler
                  </span>
                ) : (
                  <span className="text-[#f43f5e] font-semibold">Unmitigated baseline</span>
                )}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#64748b]">
              {activeData.heatwaveDays} days &gt; 38°C/yr
            </div>
          </div>

          {/* Card 2: Flood Hazard Index */}
          <div className="p-3.5 rounded-xl bg-[#0b1b26]/90 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span className="font-mono">FLOOD EXPOSURE</span>
              <Droplets size={14} className="text-[#00f2fe]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-[#00f2fe]">
                {displayFlood}%
              </div>
              <div className="text-[10.5px] text-[#94a3b8]">
                {enableIntervention ? (
                  <span className="text-[#1ed760] font-semibold">
                    -{activeData.floodRiskPercent - activeData.mitigatedFloodRisk}% reduction
                  </span>
                ) : (
                  <span className="text-[#f43f5e] font-semibold">High risk zone</span>
                )}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#64748b]">
              100-yr return storm
            </div>
          </div>

          {/* Card 3: Economic Damage */}
          <div className="p-3.5 rounded-xl bg-[#0b1b26]/90 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span className="font-mono">ASSET LOSS</span>
              <DollarSign size={14} className="text-[#1ed760]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-white">
                ${displayDamage.toFixed(1)}B
              </div>
              <div className="text-[10.5px] text-[#94a3b8]">
                Cumulative exposure
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#1ed760]">
              ${avoidedDamage}B protected
            </div>
          </div>

          {/* Card 4: Resilience Score */}
          <div className="p-3.5 rounded-xl bg-[#0b1b26]/90 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span className="font-mono">CIVIC DEFENSE</span>
              <ShieldCheck size={14} className="text-[#1ed760]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-[#1ed760]">
                {enableIntervention ? '84' : '41'}/100
              </div>
              <div className="text-[10.5px] text-[#94a3b8]">
                {enableIntervention ? 'Sustainably hardened' : 'Vulnerable grid'}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#64748b]">
              ISO 14090 Certified
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Chart View: SVG Sparklines with Active Year Indicator */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#f43f5e]" /> Unmitigated Inaction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#1ed760]" /> GeoTwin 360 AI Intervention
            </span>
          </div>
          <span className="text-[#64748b] hidden sm:inline">UNIT: {unit}</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-32 md:h-36 overflow-visible"
          >
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="mitigatedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1ed760" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1ed760" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0.25, 0.5, 0.75].map((factor) => {
              const y = chartHeight - paddingY - factor * (chartHeight - paddingY * 2);
              return (
                <line
                  key={factor}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Baseline Path */}
            <path
              d={baselinePath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={enableIntervention ? '4 3' : 'none'}
              opacity={enableIntervention ? 0.6 : 1}
            />

            {/* Mitigated Path */}
            {enableIntervention && (
              <path
                d={mitigatedPath}
                fill="none"
                stroke="#1ed760"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Active Year Vertical Marker Line */}
            <line
              x1={activeX}
              y1={paddingY}
              x2={activeX}
              y2={chartHeight - paddingY}
              stroke="#00f2fe"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Data Points on Baseline */}
            {baselinePoints.map((pt) => (
              <circle
                key={`b-${pt.year}`}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#f43f5e"
                className="transition-all duration-300"
              />
            ))}

            {/* Data Points on Mitigated */}
            {enableIntervention &&
              mitigatedPoints.map((pt) => (
                <circle
                  key={`m-${pt.year}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#1ed760"
                  className="transition-all duration-300"
                />
              ))}

            {/* Active Highlight Node */}
            <circle
              cx={activeX}
              cy={
                chartHeight -
                paddingY -
                ((enableIntervention
                  ? activeMetricTab === 'temperature'
                    ? activeData.mitigatedAnomaly
                    : activeMetricTab === 'flood'
                    ? activeData.mitigatedFloodRisk
                    : activeData.mitigatedDamageBillions
                  : activeMetricTab === 'temperature'
                  ? activeData.tempAnomaly
                  : activeMetricTab === 'flood'
                  ? activeData.floodRiskPercent
                  : activeData.assetDamageBillions) /
                  maxY) *
                  (chartHeight - paddingY * 2)
              }
              r="6"
              fill="#00f2fe"
              stroke="#ffffff"
              strokeWidth="2"
              className="drop-shadow-[0_0_8px_#00f2fe]"
            />

            {/* Bottom X-axis labels */}
            {YEARS.map((yr) => {
              const x =
                paddingX + ((yr - minYear) / (maxYear - minYear)) * (chartWidth - paddingX * 2);
              return (
                <text
                  key={yr}
                  x={x}
                  y={chartHeight - 6}
                  fill={yr === selectedYear ? '#1ed760' : '#64748b'}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={yr === selectedYear ? 'bold' : 'normal'}
                >
                  {yr}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
