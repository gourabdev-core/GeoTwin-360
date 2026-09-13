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
      <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[130px] ${className}`}>
        <div className="relative">
          <Loader2 className="h-6 w-6 animate-spin text-[#32f26b]" />
          <span className="absolute inset-0 rounded-full blur-sm bg-[#32f26b]/20 -z-10" />
        </div>
        <p className="text-xs text-[#8ea39a] font-sans">{message || 'Loading climate data...'}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[130px] bg-[#091614] border border-[#f87171]/20 rounded-xl shadow-subtle ${className}`}>
        <div className="p-2 rounded-full bg-[#f87171]/10 text-[#f87171]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#f5fff8] mb-1">{title || 'Data Unavailable'}</h4>
          <p className="text-xs text-[#8ea39a] max-w-xs mx-auto leading-relaxed">{message || 'This metric could not be loaded.'}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="h-7 text-xs px-3">
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[130px] bg-[#091614] border border-dashed border-white/10 rounded-xl ${className}`}>
      <div className="p-2 rounded-full bg-white/[0.04] text-[#8ea39a]">
        <Inbox className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-[#f5fff8] mb-1">{title || 'No data available'}</h4>
        <p className="text-xs text-[#8ea39a] max-w-xs mx-auto leading-relaxed">{message || 'No information is available for this selection.'}</p>
      </div>
    </div>
  );
};
export default DataStatus;
