import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="relative flex items-center w-full">
      {icon && (
        <span className="absolute left-4 text-text-silver flex items-center justify-center pointer-events-none">
          {icon}
        </span>
      )}
      <input
        className={`w-full bg-mid-dark text-text-base placeholder-text-silver text-sm outline-none border border-transparent rounded-full transition-all duration-200 focus:border-light-border focus:bg-dark-card ${
          icon ? 'pl-11 pr-5 py-3' : 'px-5 py-3'
        } ${className}`}
        {...props}
      />
    </div>
  );
};
