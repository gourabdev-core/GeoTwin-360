import React from 'react';
import { Skeleton } from '../ui/Skeleton.js';

interface ClimateMetricCardProps {
  name: string;
  value: number | string | null;
  unit: string;
  loading: boolean;
  error: string | null;
  dateOrYear?: string;
  sourceOrStatus?: string;
}

export const ClimateMetricCard: React.FC<ClimateMetricCardProps> = ({
  name,
  value,
  unit,
  loading,
  error,
  dateOrYear,
  sourceOrStatus,
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
  const fontSizeClass = typeof value === 'string' && value.length > 7 ? 'text-sm' : 'text-2xl';

  return (
    <div className="bg-[#0d1b18] p-4 rounded-xl flex flex-col justify-between min-h-[118px] border border-white/[0.07] hover:border-[#32f26b]/30 hover:bg-[#10221e] hover:-translate-y-0.5 hover:shadow-medium transition-all duration-200 overflow-hidden relative group">
      {/* Subtle hover corner luminescence */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-[#32f26b]/5 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <span className="text-[10px] text-[#8ea39a] font-bold uppercase tracking-wider select-none truncate block">
        {name}
      </span>

      <div className="my-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-6 w-24 bg-[#091614]" />
            <Skeleton variant="text" className="h-3 w-14 bg-[#091614]" />
          </div>
        ) : isUnavailable ? (
          <div className="flex items-center">
            <span className="text-xs font-medium text-[#8ea39a] bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.06] font-sans">
              Unavailable
            </span>
          </div>
        ) : (
          <div className="flex items-baseline space-x-1.5 truncate">
            <span className={`${fontSizeClass} font-title font-bold text-[#f5fff8] tracking-tight truncate`}>
              {value}
            </span>
            {unit && (
              <span className="text-xs text-[#8ea39a] font-sans font-medium shrink-0">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {!loading && !isUnavailable && (dateOrYear || sourceOrStatus) && (
        <div className="flex items-center justify-between text-[9px] text-[#8ea39a]/80 pt-2 border-t border-white/[0.06] font-mono select-none">
          <span className="truncate">{dateOrYear}</span>
          <span className="truncate text-right font-medium text-[#c7d4cf]/80">{sourceOrStatus}</span>
        </div>
      )}
    </div>
  );
};
export default ClimateMetricCard;
