import React from 'react';
import {
  ShieldCheck,
  Globe2,
  Satellite,
  Database,
  CloudRain,
  Cpu,
  Layers,
} from 'lucide-react';

interface PartnerSource {
  name: string;
  role: string;
  badge: string;
  icon: React.ElementType;
}

const SOURCES: PartnerSource[] = [
  {
    name: 'NASA GISTEMP v4',
    role: 'Surface Temp Anomalies',
    badge: 'NASA JPL / GISS',
    icon: Globe2,
  },
  {
    name: 'ESA Copernicus',
    role: 'Sentinel-2 MSI 10m',
    badge: 'Multispectral L2A',
    icon: Satellite,
  },
  {
    name: 'ECMWF ERA5',
    role: 'Atmospheric Reanalysis',
    badge: '0.25° Global Grid',
    icon: CloudRain,
  },
  {
    name: 'IPCC AR6 CMIP6',
    role: 'Climate Scenarios',
    badge: 'SSP1-2.6 to SSP5-8.5',
    icon: Layers,
  },
  {
    name: 'NOAA GFS',
    role: 'Hydro-Meteorology',
    badge: 'Global Numerical Model',
    icon: Database,
  },
  {
    name: 'Open-Meteo API',
    role: 'Ensemble Weather Feeds',
    badge: 'Seamless Solar/Wind/Rain',
    icon: Cpu,
  },
];

export const InstitutionalMarquee: React.FC = () => {
  return (
    <div className="w-full py-8 border-y border-white/10 bg-[#02070c]/80 backdrop-blur-md overflow-hidden relative">
      <div className="lp-container mb-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#94a3b8] uppercase tracking-widest">
          <ShieldCheck size={14} className="text-[#1ed760]" />
          <span>VERIFIED TELEMETRY PROVENANCE • ZERO SYNTHETIC FABRICATION</span>
        </div>
      </div>

      <div className="flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <div className="flex items-center gap-6 animate-[marquee_35s_linear_infinite] whitespace-nowrap px-4">
          {[...SOURCES, ...SOURCES].map((src, i) => {
            const IconComp = src.icon;
            return (
              <div
                key={`${src.name}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#1ed760]/40 transition-colors shrink-0 group cursor-default"
              >
                <div className="p-1.5 rounded-lg bg-white/5 text-[#00f2fe] group-hover:text-[#1ed760] transition-colors">
                  <IconComp size={16} />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">{src.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#94a3b8]">
                      {src.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748b]">{src.role}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
