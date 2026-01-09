import React from 'react';
import { Package } from 'lucide-react';

export const Logo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const isLarge = size === 'lg';
  
  return (
    <div className={`flex flex-col items-center justify-center ${isLarge ? 'gap-3' : 'gap-1'}`}>
      <div className={`flex items-center justify-center rounded-xl bg-pureOrange ${isLarge ? 'w-16 h-16' : 'w-10 h-10'} shadow-lg shadow-pureOrange/20`}>
        <Package className={`text-white ${isLarge ? 'w-8 h-8' : 'w-6 h-6'}`} strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <h1 className={`font-bold tracking-wider text-white ${isLarge ? 'text-2xl' : 'text-lg'}`}>
          EXPEDI<span className="text-pureOrange">-CARGO</span>
        </h1>
        {isLarge && (
          <p className="text-[10px] text-pureOrange font-black uppercase tracking-[0.1em] mt-1 animate-fade-in">
            Parce que chaque livraison compte.
          </p>
        )}
      </div>
    </div>
  );
};
