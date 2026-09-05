import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button.js';

interface DataStatusProps {
  status: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const DataStatus: React.FC<DataStatusProps> = ({
  status,
  title,
  message,
  onRetry,
  className = '',
}) => {
  if (status === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[120px] ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-spotify-green" />
        <p className="text-xs text-text-silver font-sans">{message || 'Loading data...'}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[120px] bg-dark-surface border border-transparent rounded-lg ${className}`}>
        <AlertTriangle className="h-6 w-6 text-text-negative" />
        <div>
          <h4 className="text-xs font-bold text-text-base mb-1">{title || 'Service Unavailable'}</h4>
          <p className="text-xs text-text-silver max-w-xs mx-auto leading-relaxed">{message || 'This metric could not be loaded.'}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="h-8 text-xs">
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[120px] bg-dark-surface border border-dashed border-border-gray rounded-lg ${className}`}>
      <Inbox className="h-6 w-6 text-text-silver" />
      <div>
        <h4 className="text-xs font-bold text-text-base mb-1">{title || 'No data available'}</h4>
        <p className="text-xs text-text-silver max-w-xs mx-auto leading-relaxed">{message || 'No information is available for this selection.'}</p>
      </div>
    </div>
  );
};
export default DataStatus;
