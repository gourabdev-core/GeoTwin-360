import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-sans font-bold tracking-[1.4px] uppercase transition-all duration-200 select-none cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-4 py-2 rounded-full',
    md: 'text-sm px-6 py-3 rounded-full',
    lg: 'text-base px-8 py-4 rounded-full',
  };

  const variantStyles = {
    primary: 'bg-spotify-green text-black hover:scale-[1.04] active:scale-[0.98] border-none',
    secondary: 'bg-mid-dark text-text-base hover:bg-dark-card hover:scale-[1.04] active:scale-[0.98] border-none',
    outline: 'bg-transparent text-text-base border border-light-border hover:border-text-base hover:scale-[1.04] active:scale-[0.98]',
    circle: 'rounded-full bg-mid-dark text-text-base hover:bg-dark-card p-3 hover:scale-[1.04] active:scale-[0.98] border-none',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
