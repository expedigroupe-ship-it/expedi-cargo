import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  error?: string;
  as?: 'input' | 'textarea' | 'select';
  options?: { label: string; value: string }[];
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  as = 'input', 
  className = '', 
  options,
  ...props 
}) => {
  const baseClass = "w-full bg-midnightLight border border-slate-700 text-white rounded-lg p-3 focus:outline-none focus:border-pureOrange focus:ring-1 focus:ring-pureOrange transition-colors placeholder-slate-500";

  return (
    <div className="flex flex-col gap-1 mb-4">
      <label className="text-sm text-slate-400 font-medium ml-1">{label}</label>
      
      {as === 'textarea' ? (
        <textarea 
          className={`${baseClass} min-h-[100px] ${className}`} 
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} 
        />
      ) : as === 'select' ? (
        <select 
          className={`${baseClass} ${className}`} 
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input 
          className={`${baseClass} ${className}`} 
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)} 
        />
      )}
      
      {error && <span className="text-red-500 text-xs ml-1">{error}</span>}
    </div>
  );
};
