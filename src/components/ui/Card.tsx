import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-dark-surface rounded-lg p-5 shadow-medium transition-all duration-200 ${
        hoverable ? 'hover:bg-mid-dark hover:scale-[1.01] hover:shadow-heavy' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
