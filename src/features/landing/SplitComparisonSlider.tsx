import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Flame,
  Leaf,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const SplitComparisonSlider: React.FC = () => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const clamped = Math.min(Math.max((offsetX / rect.width) * 100, 5), 95);
    setSliderPos(clamped);
  }, []);

  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };
    const onMouseUp = () => setIsDragging(false);

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="relative rounded-2xl bg-[#061019]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(0,242,254,0.12)] p-5 md:p-6 text-white overflow-hidden">
      {/* Laser Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f43f5e] via-white to-[#1ed760]" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders size={14} className="text-[#00f2fe]" />
            <span className="text-[11px] font-mono tracking-widest text-[#00f2fe] uppercase">
              INTERACTIVE DIGITAL TWIN SPLIT-VIEW
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Unmitigated Crisis vs. GeoTwin 360 Resilience
          </h3>
          <p className="text-xs text-[#94a3b8]">
            Drag the divider to inspect how algorithmic intervention reorganizes urban thermal and hydrologic dynamics.
          </p>
        </div>

        {/* Quick Legend Tags */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-[#f43f5e] bg-[#f43f5e]/10 px-2.5 py-1 rounded-md border border-[#f43f5e]/20">
            <AlertTriangle size={12} /> INACTION (BAU)
          </span>
          <span className="flex items-center gap-1.5 text-[#1ed760] bg-[#1ed760]/10 px-2.5 py-1 rounded-md border border-[#1ed760]/20">
            <CheckCircle2 size={12} /> GEOTWIN 360
          </span>
        </div>
      </div>

      {/* Draggable Viewport Canvas */}
      <div
        ref={containerRef}
        onClick={(e) => handleMove(e.clientX)}
        className="relative w-full h-80 md:h-96 my-5 rounded-xl overflow-hidden cursor-ew-resize select-none border border-white/10 bg-[#02070c]"
      >
        {/* Background Image: Common Urban Geometry */}
        <img
          src="/hero-bg.jpg"
          alt="Urban landscape"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.7] contrast-[1.2]"
        />

        {/* LEFT LAYER: Unmitigated Climate Crisis (Heat & Flood Stress) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        >
          {/* Crimson / Thermal Stress Filter */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#f43f5e]/50 via-[#ef4444]/35 to-transparent mix-blend-color-burn" />
          <div className="absolute inset-0 bg-red-950/40 mix-blend-multiply" />

          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

          {/* Left Watermark / Status */}
          <div className="absolute top-4 left-4 p-3 rounded-lg bg-[#02070c]/85 border border-[#f43f5e]/40 backdrop-blur-md max-w-[220px]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f43f5e] uppercase tracking-wider">
              <Flame size={14} /> CLIMATE INACTION 2035
            </div>
            <div className="mt-1 space-y-1 text-xs">
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Surface Temp:</span>
                <span className="font-mono text-[#f43f5e] font-bold">42.8°C</span>
              </div>
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Stormwater Runoff:</span>
                <span className="font-mono text-[#f43f5e] font-bold">88%</span>
              </div>
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Heatwave Vulnerability:</span>
                <span className="font-mono text-[#f43f5e] font-bold">CRITICAL</span>
              </div>
            </div>
          </div>

          {/* Simulated Flood Runoff Contour */}
          <div className="absolute bottom-4 left-4 text-[10px] font-mono text-[#fca5a5] bg-[#02070c]/80 px-2.5 py-1 rounded border border-[#f43f5e]/30">
            FLOOD RISK: 68% SEVERE THREAT
          </div>
        </div>

        {/* RIGHT LAYER: GeoTwin 360 AI Intervention (Green Canopy & Sponge City) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }}
        >
          {/* Emerald / Cyan Cooling Filter */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1ed760]/30 via-[#00f2fe]/20 to-transparent mix-blend-color-dodge" />
          <div className="absolute inset-0 bg-emerald-950/25 mix-blend-multiply" />

          {/* Precision Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#1ed760_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

          {/* Right Watermark / Status */}
          <div className="absolute top-4 right-4 p-3 rounded-lg bg-[#02070c]/85 border border-[#1ed760]/40 backdrop-blur-md max-w-[220px]">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1ed760] uppercase tracking-wider">
              <Leaf size={14} /> GEOTWIN 360 DEPLOYED
            </div>
            <div className="mt-1 space-y-1 text-xs">
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Surface Temp:</span>
                <span className="font-mono text-[#1ed760] font-bold">34.6°C (-8.2°)</span>
              </div>
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Permeable Retention:</span>
                <span className="font-mono text-[#1ed760] font-bold">76% INFILTRATED</span>
              </div>
              <div className="flex justify-between text-[#cbd5e1]">
                <span>Civic Resilience:</span>
                <span className="font-mono text-[#00f2fe] font-bold">GRADE A+</span>
              </div>
            </div>
          </div>

          {/* Right Floating Badge */}
          <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[#86efac] bg-[#02070c]/80 px-2.5 py-1 rounded border border-[#1ed760]/30">
            AI CANOPY: 15,000 TREES + 4 SPONGE BASINS
          </div>
        </div>

        {/* DRAGGABLE VERTICAL DIVIDER BAR */}
        <div
          className="absolute top-0 bottom-0 w-[3px] bg-white cursor-ew-resize shadow-[0_0_15px_#00f2fe]"
          style={{ left: `${sliderPos}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Glowing Center Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-9 h-9 rounded-full bg-[#061019] border-2 border-white shadow-[0_0_20px_#1ed760] flex items-center justify-center cursor-ew-resize group hover:scale-110 transition-transform">
            <div className="flex items-center gap-0.5 text-white">
              <div className="w-1 h-3.5 bg-[#f43f5e] rounded-full" />
              <div className="w-1 h-3.5 bg-[#1ed760] rounded-full" />
            </div>
          </div>

          {/* Percentage Tag */}
          <div className="absolute bottom-2 -translate-x-1/2 left-1/2 px-2 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white border border-white/20 whitespace-nowrap">
            {sliderPos.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Comparative Metric Bar Below */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-2.5 rounded-lg bg-[#0b1b26]/70 border border-white/5">
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Microclimate Delta</div>
          <div className="text-sm font-bold text-[#1ed760] mt-0.5">-8.2°C Urban Peak</div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0b1b26]/70 border border-white/5">
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Stormwater Infiltration</div>
          <div className="text-sm font-bold text-[#00f2fe] mt-0.5">3.4x Retention Volume</div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0b1b26]/70 border border-white/5">
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase">CapEx Payback Horizon</div>
          <div className="text-sm font-bold text-white mt-0.5">4.8 Years Avoided Loss</div>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0b1b26]/70 border border-white/5">
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Carbon Sequestration</div>
          <div className="text-sm font-bold text-[#1ed760] mt-0.5">42,500 tCO2e/decade</div>
        </div>
      </div>
    </div>
  );
};
