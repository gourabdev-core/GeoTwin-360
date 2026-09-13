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
  const baseStyle =
    'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 ease-out select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#32f26b]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110f] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-5 py-2.5 rounded-xl gap-2',
    lg: 'text-base px-6 py-3 rounded-xl gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#32f26b] text-[#07110f] font-bold shadow-[0_0_16px_rgba(50,242,107,0.22)] hover:shadow-[0_0_24px_rgba(50,242,107,0.38)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border border-[#32f26b]/30',
    secondary:
      'bg-[#0d1b18]/90 text-[#f5fff8] border border-white/[0.08] hover:bg-[#10221e] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-subtle',
    outline:
      'bg-transparent text-[#f5fff8] border border-white/15 hover:border-[#32f26b]/50 hover:text-[#32f26b] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
    circle:
      'rounded-full bg-[#0d1b18]/90 text-[#f5fff8] border border-white/[0.08] hover:bg-[#10221e] hover:border-[#32f26b]/30 p-2.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-subtle',
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
export default Button;
