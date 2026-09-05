import React, { useState } from 'react';
import { Sliders, MapPin } from 'lucide-react';
import { useLocation } from '../../context/LocationContext.js';
import { ScenarioSimulator } from '../../components/dashboard/ScenarioSimulator.js';
import { EmptyState } from '../../components/ui/EmptyState.js';

export const SimulatorPage: React.FC = () => {
  const { selectedLocation, loading: locationLoading } = useLocation();
  const [selectedYear, setSelectedYear] = useState<number>(2035);
  const years = [2030, 2035, 2040, 2050];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-dark-surface rounded-lg shadow-medium gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <Sliders size={24} />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-text-base">Scenario Simulator</h2>
            <p className="text-xs text-text-silver">Test regional environmental interventions and calculate outcomes</p>
          </div>
        </div>

        {selectedLocation && (
          <div className="flex bg-mid-dark p-1 rounded-full self-start sm:self-auto">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
                  selectedYear === year
                    ? 'bg-spotify-green text-black'
                    : 'text-text-silver hover:text-text-base'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Simulator Content */}
      {locationLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-dark-surface rounded-lg shadow-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spotify-green"></div>
          <span className="text-sm text-text-silver font-sans">Syncing location context...</span>
        </div>
      ) : !selectedLocation ? (
        <EmptyState
          title="No location selected"
          description="Search for a location in the header to configure and run simulations."
          icon={<MapPin size={48} className="text-spotify-green" />}
        />
      ) : (
        <ScenarioSimulator
          locationId={selectedLocation.id}
          year={selectedYear}
          onSimulationResult={() => {}}
        />
      )}
    </div>
  );
};

export default SimulatorPage;
