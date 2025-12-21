import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false, 
  isLoading = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const sizes = {
    sm: "py-2 px-4 text-sm",
    md: "py-3 px-6",
    lg: "py-4 px-8 text-lg"
  };

  const variants = {
    primary: "bg-pureOrange text-white hover:bg-pureOrangeHover shadow-lg shadow-pureOrange/20",
    secondary: "bg-midnightLight text-white border border-slate-700 hover:bg-slate-800",
    outline: "bg-transparent border-2 border-pureOrange text-pureOrange hover:bg-pureOrange/10"
  };

  return (
    <button 
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
      ) : null}
      {children}
    </button>
  );
};