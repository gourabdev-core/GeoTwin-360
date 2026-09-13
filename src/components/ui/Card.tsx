import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'elevated' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#091614] border border-white/[0.07] shadow-medium',
    elevated: 'bg-[#0d1b18] border border-white/[0.09] shadow-heavy',
    glass: 'glass-panel shadow-heavy',
  };

  const hoverStyle = hoverable
    ? 'hover:border-white/15 hover:bg-[#0d1b18] hover:-translate-y-0.5 hover:shadow-heavy cursor-pointer'
    : '';

  return (
    <div
      className={`rounded-2xl p-5.5 transition-all duration-200 ease-out ${variantStyles[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
