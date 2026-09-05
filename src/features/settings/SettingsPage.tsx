import React from 'react';
import { Settings } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 p-4 bg-dark-surface rounded-lg shadow-medium">
        <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-lg font-title font-bold text-text-base">System Settings</h2>
          <p className="text-xs text-text-silver">Adjust data models, provider API keys, and metric units</p>
        </div>
      </div>

      <Card className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-mid-dark rounded-full mb-4">
          <Settings size={48} className="text-text-silver" />
        </div>
        <h3 className="text-lg font-title font-bold text-text-base mb-2">Settings Console</h3>
        <p className="text-sm text-text-silver max-w-sm leading-relaxed">
          Configure preferred unit conversions (e.g. Metric vs Imperial) and manage user options.
        </p>
      </Card>
    </div>
  );
};
export default SettingsPage;
