import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Gauge,
  Brain,
  FileText,
  Sliders,
  MapPin,
  X,
  Zap,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'CITIES' | 'SIMULATION' | 'INTELLIGENCE' | 'ACTIONS';
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity?: (cityName: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectCity,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands: CommandItem[] = [
    {
      id: 'city-kolkata',
      category: 'CITIES',
      title: 'Load Kolkata Digital Twin',
      description: 'Switch 3D twin to Kolkata, India (22.57°N, 88.36°E)',
      icon: 'MapPin',
      action: () => {
        if (onSelectCity) onSelectCity('Kolkata');
        onClose();
      },
    },
    {
      id: 'city-singapore',
      category: 'CITIES',
      title: 'Load Singapore Marina Bay Twin',
      description: 'Switch 3D twin to Singapore (1.28°N, 103.85°E)',
      icon: 'MapPin',
      action: () => {
        if (onSelectCity) onSelectCity('Singapore');
        onClose();
      },
    },
    {
      id: 'city-rotterdam',
      category: 'CITIES',
      title: 'Load Rotterdam Sponge Dike Twin',
      description: 'Switch 3D twin to Rotterdam, Netherlands (51.92°N, 4.47°E)',
      icon: 'MapPin',
      action: () => {
        if (onSelectCity) onSelectCity('Rotterdam');
        onClose();
      },
    },
    {
      id: 'sim-trees',
      category: 'SIMULATION',
      title: 'Simulate +15,000 Native Urban Trees',
      description: 'Model microclimate thermodynamic cooling in urban heat pockets',
      icon: 'Sliders',
      action: () => {
        const el = document.querySelector('#simulation');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        onClose();
      },
    },
    {
      id: 'sim-roofs',
      category: 'SIMULATION',
      title: 'Simulate High-Albedo Cool Roof Program',
      description: 'Model 450,000 m² commercial roof coating with 0.85 SRI',
      icon: 'Zap',
      action: () => {
        const el = document.querySelector('#simulation');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        onClose();
      },
    },
    {
      id: 'open-dashboard',
      category: 'ACTIONS',
      title: 'Launch Full Telemetry Dashboard',
      description: 'Navigate to real-time maps, sensor telemetry, and simulation',
      icon: 'Gauge',
      action: () => {
        navigate('/dashboard');
        onClose();
      },
    },
    {
      id: 'ai-advisor',
      category: 'INTELLIGENCE',
      title: 'Query Institutional AI Climate Advisor',
      description: 'Explore municipal capital optimization and IPCC recommendations',
      icon: 'Brain',
      action: () => {
        const el = document.querySelector('#ai-advisor');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        onClose();
      },
    },
    {
      id: 'export-report',
      category: 'ACTIONS',
      title: 'View Certified Audit Dossiers',
      description: 'Inspect verified PDF climate risk assessments and ESG scoring',
      icon: 'FileText',
      action: () => {
        navigate('/reports');
        onClose();
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation inside Command Palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-[#02070c]/80 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#061019] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(30,215,96,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-[#07131e]">
          <Search size={18} className="text-[#1ed760] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a city or simulation command (e.g. 'Kolkata', 'Trees', 'Dashboard')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-[#64748b] focus:outline-none"
          />
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748b] bg-[#02070c] px-2 py-1 rounded border border-white/10 shrink-0">
            <span>ESC TO CLOSE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94a3b8]">
              No digital twin commands found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1ed760]/10 border border-[#1ed760]/30 text-white'
                      : 'border border-transparent text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#1ed760] text-black shadow-[0_0_12px_rgba(30,215,96,0.5)]'
                          : 'bg-white/5 text-[#94a3b8]'
                      }`}
                    >
                      {item.icon === 'MapPin' && <MapPin size={15} />}
                      {item.icon === 'Sliders' && <Sliders size={15} />}
                      {item.icon === 'Zap' && <Zap size={15} />}
                      {item.icon === 'Gauge' && <Gauge size={15} />}
                      {item.icon === 'Brain' && <Brain size={15} />}
                      {item.icon === 'FileText' && <FileText size={15} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[9px] font-mono text-[#00f2fe] bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/20">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-transform ${
                      isSelected ? 'text-[#1ed760] translate-x-1' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#02070c] border-t border-white/10 text-[10.5px] font-mono text-[#64748b]">
          <div className="flex items-center gap-3">
            <span>Use ↑ ↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#1ed760]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
            <span>GeoTwin Omnibar v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
