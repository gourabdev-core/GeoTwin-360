import React from 'react';
import { Skeleton } from '../ui/Skeleton.js';

interface ClimateMetricCardProps {
  name: string;
  value: number | string | null;
  unit: string;
  loading: boolean;
  error: string | null;
}

export const ClimateMetricCard: React.FC<ClimateMetricCardProps> = ({
  name,
  value,
  unit,
  loading,
  error,
}) => {
  const stringVal = value !== null && value !== undefined ? String(value).trim() : '';
  const isValueUnavailable =
    value === null ||
    value === undefined ||
    stringVal === '' ||
    stringVal.toUpperCase() === 'UNAVAILABLE' ||
    stringVal.toLowerCase().includes('unavailable') ||
    stringVal.toLowerCase().includes('no data');

  const isUnavailable = Boolean(error) || isValueUnavailable;
  const fontSizeClass = typeof value === 'string' && value.length > 7 ? 'text-sm' : 'text-xl';

  return (
    <div className="bg-mid-dark p-4 rounded-lg flex flex-col justify-between h-28 hover:bg-dark-card transition-colors duration-200 overflow-hidden">
      <span className="text-[10px] text-text-silver font-bold uppercase tracking-wider select-none truncate">
        {name}
      </span>
      <div className="space-y-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-5 w-20 bg-dark-surface" />
            <Skeleton variant="text" className="h-3 w-12 bg-dark-surface" />
          </div>
        ) : isUnavailable ? (
          <div className="flex items-center">
            <span className="text-xs font-medium text-text-silver bg-dark-surface px-2.5 py-1 rounded border border-light-border/10 font-sans">
              Unavailable
            </span>
          </div>
        ) : (
          <div className="flex items-baseline space-x-1 truncate">
            <span className={`${fontSizeClass} font-title font-bold text-text-base truncate`}>
              {value}
            </span>
            {unit && (
              <span className="text-xs text-text-silver font-sans shrink-0">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default ClimateMetricCard;
