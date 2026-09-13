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
        <span className="absolute left-3.5 text-[#8ea39a] flex items-center justify-center pointer-events-none transition-colors">
          {icon}
        </span>
      )}
      <input
        className={`w-full bg-[#0d1b18] text-[#f5fff8] placeholder-[#8ea39a] text-sm outline-none border border-white/[0.08] rounded-xl transition-all duration-200 focus:border-[#32f26b]/50 focus:bg-[#10221e] focus:shadow-[0_0_16px_rgba(50,242,107,0.15)] ${
          icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5'
        } ${className}`}
        {...props}
      />
    </div>
  );
};
export default Input;
