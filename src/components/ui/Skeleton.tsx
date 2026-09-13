import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
}) => {
  const baseClass = 'animate-pulse bg-[#0d1b18]/80 border border-white/[0.04]';

  const variantClasses = {
    text: 'h-4 w-full rounded-md',
    rect: 'h-24 w-full rounded-xl',
    circle: 'h-12 w-12 rounded-full',
  };

  return <div className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
};
export default Skeleton;
