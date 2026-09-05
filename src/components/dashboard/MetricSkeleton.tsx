import React from 'react';
import { Skeleton } from '../ui/Skeleton.js';

export const MetricSkeleton: React.FC = () => {
  return (
    <div className="space-y-1.5">
      <Skeleton variant="text" className="h-3 w-16 bg-dark-surface" />
      <Skeleton variant="text" className="h-5 w-24 bg-dark-surface" />
    </div>
  );
};
export default MetricSkeleton;
