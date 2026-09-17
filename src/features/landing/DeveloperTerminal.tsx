import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Play,
  CheckCircle2,
  Cpu,
  Layers,
  Code2,
} from 'lucide-react';

export const DeveloperTerminal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'typescript' | 'python'>('curl');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const snippets = {
    curl: `curl -X POST https://api.geotwin360.io/v1/twins/simulate \\
  -H "Authorization: Bearer geotwin_live_key_9942a" \\
  -H "Content-Type: application/json" \\
  -d '{
    "city_id": "kolkata_metro",
    "horizon_year": 2035,
    "scenario": "SSP2-4.5",
    "interventions": ["sponge_basin", "urban_canopy_15k"]
  }'`,

    typescript: `import { GeoTwinSDK } from '@geotwin360/sdk';

const client = new GeoTwinSDK({ apiKey: process.env.GEOTWIN_API_KEY });

const simulation = await client.simulations.run({
  cityId: 'kolkata_metro',
  targetYear: 2035,
  pathway: 'SSP2-4.5',
  interventions: [
    { type: 'sponge_corridor', count: 4 },
    { type: 'urban_tree_canopy', count: 15000 }
  ]
});

console.log(\`Projected Temp: \${simulation.metrics.surfaceTemp}°C\`);
console.log(\`Avoided Economic Loss: $\${simulation.mitigation.avoidedDamagesUSD}M\`);`,

    python: `from geotwin import GeoTwinClient

client = GeoTwinClient(api_key="geotwin_live_key_9942a")

# Run deterministic thermodynamic twin simulation
result = client.simulate(
    city_id="kolkata_metro",
    target_year=2035,
    scenario="SSP2-4.5",
    interventions=["sponge_basin", "urban_canopy_15k"]
)

print(f"Avoided Flood Exposure: {result.flood_hazard_reduction_pct}%")
print(f"Resilience Index: {result.sustainability_score}/100")`,
  };

  const sampleResponse = `{
  "status": "success",
  "twin_id": "twin_kolkata_2035_ssp245",
  "execution_time_ms": 38.4,
  "engine_version": "GeoTwin-V4.2-HydroThermo",
  "metrics": {
    "baseline_temp_c": 36.8,
    "mitigated_temp_c": 34.2,
    "delta_c": -2.6,
    "flood_risk_pct": 28.4,
    "avoided_damages_usd": "8.6B",
    "sustainability_score": 84
  },
  "provenance": {
    "elevation_grid": "NASA SRTM 30m",
    "satellite_telemetry": "Sentinel-2 MSI Level-2A",
    "meteorology": "ECMWF ERA5 Reanalysis"
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 600);
  };

  return (
    <div className="relative rounded-2xl bg-[#061019]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(30,215,96,0.12)] p-5 md:p-6 text-white overflow-hidden">
      {/* Top Laser Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00f2fe] via-[#1ed760] to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Code2 size={14} className="text-[#1ed760]" />
            <span className="text-[11px] font-mono tracking-widest text-[#1ed760] uppercase">
              DEVELOPER API & OPEN PLATFORM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Programmatic Digital Twin Execution
          </h3>
          <p className="text-xs text-[#94a3b8]">
            Integrate GeoTwin 360 into your GIS pipelines, municipal dashboards, and ESG reporting workflows.
          </p>
        </div>

        {/* Tab Switcher & Copy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#02070c] p-1 rounded-xl border border-white/10">
            {(['curl', 'typescript', 'python'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                {tab === 'curl' ? 'cURL' : tab === 'typescript' ? 'TypeScript' : 'Python'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-[#02070c] border border-white/10 text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
            title="Copy snippet"
          >
            {copied ? <Check size={16} className="text-[#1ed760]" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Code Editor & Response Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-4">
        {/* Request Block */}
        <div className="lg:col-span-7 bg-[#02070c] rounded-xl border border-white/10 p-4 font-mono text-xs overflow-x-auto relative flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] text-[11px] pb-2 border-b border-white/5 mb-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="ml-2 text-slate-400">request.sh</span>
            </span>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#1ed760] text-black font-bold hover:bg-[#16b84f] transition-all cursor-pointer text-[10.5px]"
            >
              <Play size={12} fill="currentColor" />
              {isRunning ? 'SIMULATING...' : 'RUN REQUEST'}
            </button>
          </div>

          <pre className="text-[#94a3b8] leading-relaxed select-text py-2">
            <code>{snippets[activeTab]}</code>
          </pre>

          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-[#64748b]">
            <span>POST /v1/twins/simulate</span>
            <span>REST API v1.4</span>
          </div>
        </div>

        {/* Response Block */}
        <div className="lg:col-span-5 bg-[#02070c] rounded-xl border border-white/10 p-4 font-mono text-xs overflow-x-auto relative flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] text-[11px] pb-2 border-b border-white/5 mb-3">
            <span className="text-slate-400">response.json</span>
            <span className="flex items-center gap-1.5 text-[#1ed760] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
              200 OK • 38ms
            </span>
          </div>

          <pre className="text-[#00f2fe] leading-relaxed text-[11px] py-1 select-text">
            <code>{sampleResponse}</code>
          </pre>

          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-[#64748b]">
            <span className="text-[#1ed760]">COMPLIANT: PostGIS / ISO 14090</span>
            <span>P99: 48ms</span>
          </div>
        </div>
      </div>

      {/* Feature Specs Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Cpu size={14} className="text-[#1ed760]" />
          <span>Deterministic Physics Engine</span>
        </div>
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Layers size={14} className="text-[#00f2fe]" />
          <span>GeoJSON & STAC Native</span>
        </div>
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <CheckCircle2 size={14} className="text-[#1ed760]" />
          <span>Zero Hallucination Guaranteed</span>
        </div>
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Terminal size={14} className="text-[#f59e0b]" />
          <span>SDKs in TS, Python & Go</span>
        </div>
      </div>
    </div>
  );
};
