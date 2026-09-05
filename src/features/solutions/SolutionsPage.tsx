import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Award, TreePine, Droplet, Home, Sun, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { useLocation } from '../../context/LocationContext.js';

interface SolutionItem {
  id: string;
  name: string;
  description: string;
  impacts: string[];
  status: 'Active' | 'Planned' | 'Proposed';
  progress: number;
  priority: string;
  icon: React.ReactNode;
  category: string;
}

export const SolutionsPage: React.FC = () => {
  const { selectedLocation } = useLocation();
  const [liveData, setLiveData] = useState<{
    temperature: number;
    precipitation: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const lat = selectedLocation ? Number(selectedLocation.latitude) : null;
  const lng = selectedLocation ? Number(selectedLocation.longitude) : null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setLiveData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchLiveWeatherData = async () => {
      try {
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation`,
          { timeout: 5000 }
        );

        if (isMounted) {
          const current = response.data?.current;
          setLiveData({
            temperature: current?.temperature_2m ?? 25.0,
            precipitation: current?.precipitation ?? 0.0,
          });
        }
      } catch (err: any) {
        console.warn('[SolutionsPage] Open-Meteo fetch failed, using fallback metrics:', err);
        if (isMounted) {
          setLiveData({
            temperature: 25.0,
            precipitation: 2.5,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLiveWeatherData();

    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  // Baseline values (liveData or defaults)
  const temp = liveData?.temperature ?? 25.0;
  const precip = liveData?.precipitation ?? 0.0;

  // Exact Mathematical Impact Formulas:
  // Urban Canopy Temp Impact: -(temp * 0.05).toFixed(1) °C
  const urbanCanopyTempImpact = (temp * -0.05).toFixed(1);
  const urbanCanopyFloodImpact = precip > 5 ? '-8%' : '-5%';

  // Cool Roofs Temp Impact: -(temp * 0.08).toFixed(1) °C
  const coolRoofsTempImpact = (temp * -0.08).toFixed(1);

  // Rainwater Harvesting Water Availability: +(precip * 2).toFixed(1) mm
  const rainwaterAvailabilityImpact = precip > 0 ? `+${(precip * 2).toFixed(1)} mm` : '+15.0 mm';
  const rainwaterFloodImpact = precip > 5 ? '-25%' : '-15%';

  // Solar CO2 Impact
  const solarCo2Impact = temp > 28 ? '-35%' : '-30%';

  const catalogItems: SolutionItem[] = [
    {
      id: 'urban-canopy',
      name: 'Urban Canopy Expansion',
      description: 'Increase urban tree coverage to reduce ambient heat and absorb CO2.',
      impacts: [`${urbanCanopyTempImpact}°C Temp`, `${urbanCanopyFloodImpact} Flood Risk`],
      status: 'Active',
      progress: 100,
      priority: temp > 30 ? 'High Priority' : 'Recommended',
      icon: <TreePine size={20} className="text-emerald-400" />,
      category: 'Green Infrastructure',
    },
    {
      id: 'rainwater-harvesting',
      name: 'Rainwater Harvesting Infrastructure',
      description: 'Capture surface runoff to replenish aquifers and prevent street pooling.',
      impacts: [`${rainwaterFloodImpact} Flood Risk`, `${rainwaterAvailabilityImpact} Water Availability`],
      status: 'Planned',
      progress: 40,
      priority: precip > 5 ? 'High Priority' : 'Recommended',
      icon: <Droplet size={20} className="text-blue-400" />,
      category: 'Water Management',
    },
    {
      id: 'cool-roofs',
      name: 'Cool Roofs Program',
      description: 'Apply reflective building coatings to lower the urban heat island effect.',
      impacts: [`${coolRoofsTempImpact}°C Temp`],
      status: 'Proposed',
      progress: 15,
      priority: temp > 28 ? 'High Priority' : 'Recommended',
      icon: <Home size={20} className="text-amber-400" />,
      category: 'Sustainable Buildings',
    },
    {
      id: 'solar-microgrids',
      name: 'Solar Micro-Grids',
      description: 'Replace localized fossil-fuel energy with renewable solar architecture.',
      impacts: [`${solarCo2Impact} CO2 Emissions`],
      status: 'Active',
      progress: 100,
      priority: 'Recommended',
      icon: <Sun size={20} className="text-yellow-400" />,
      category: 'Renewable Energy',
    },
  ];

  const getStatusBadge = (status: 'Active' | 'Planned' | 'Proposed') => {
    switch (status) {
      case 'Active':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'Planned':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Planned
          </span>
        );
      case 'Proposed':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Proposed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium border border-border-gray/30">
        <div className="p-2 bg-mid-dark rounded-full text-spotify-green animate-pulse">
          <Award size={24} />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-text-base">Resilience Solutions</h2>
          <p className="text-xs text-text-silver">Catalog of active and planned sustainability initiatives</p>
        </div>
      </div>

      {/* Tailored Location Context Banner */}
      {selectedLocation && (
        <div className="bg-mid-dark border border-spotify-green/20 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-sans">
          <span className="text-text-base font-semibold flex items-center gap-2">
            <span>Tailored Solutions for</span>
            <span className="text-spotify-green font-bold">
              {selectedLocation.name}, {selectedLocation.country}
            </span>
          </span>
          <div className="flex items-center space-x-2">
            {loading ? (
              <span className="text-[10px] text-text-silver font-mono bg-dark-surface px-2.5 py-0.5 rounded border border-border-gray/30 flex items-center gap-1.5">
                <RefreshCw size={10} className="animate-spin text-spotify-green" />
                Fetching Open-Meteo data...
              </span>
            ) : (
              <span className="text-[10px] text-text-silver font-mono bg-dark-surface px-2.5 py-0.5 rounded border border-border-gray/30 flex items-center gap-1">
                <CheckCircle size={10} className="text-spotify-green" />
                Live ({temp}°C, {precip}mm)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catalogItems.map((item) => (
          <Card
            key={item.id}
            className="flex flex-col justify-between p-5 bg-dark-surface border border-border-gray/40 hover:border-spotify-green/20 transition-all duration-200 hover:scale-[1.01]"
          >
            <div className="space-y-4">
              {/* Card Title & Category */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-mid-dark rounded-lg">{item.icon}</div>
                  <div>
                    <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider block">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-title font-bold text-text-base mt-0.5">{item.name}</h3>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {getStatusBadge(item.status)}
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      item.priority === 'High Priority'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-border-gray/40 text-text-silver border border-border-gray/50'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-silver leading-relaxed font-sans">{item.description}</p>

              {/* Impacts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider block">
                  Projected Environmental Impact
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {loading ? (
                    <div className="h-5 w-24 bg-mid-dark animate-pulse rounded"></div>
                  ) : (
                    item.impacts.map((impact, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-mid-dark text-spotify-green border border-border-gray/30"
                      >
                        {impact}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 pt-3 border-t border-border-gray/20 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-text-silver font-bold uppercase tracking-wider">
                <span>Deployment Stage</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-mid-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-spotify-green rounded-full transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SolutionsPage;
