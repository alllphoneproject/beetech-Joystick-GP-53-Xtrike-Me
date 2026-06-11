import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useAppContext } from '../context/AppContext';
import { HotspotInfo } from '../types';

interface HotspotProps {
  hotspot: HotspotInfo;
}

export const Hotspot: React.FC<HotspotProps> = ({ hotspot }) => {
  const { id, nameEn, nameHe, descEn, descHe, position } = hotspot;
  const { activeHotspot, setActiveHotspot, language } = useAppContext();

  const isHebrew = language === 'he';
  const isActive = activeHotspot === id;

  const title = isHebrew ? nameHe : nameEn;
  const description = isHebrew ? descHe : descEn;

  // Render styles dynamically using Tailwind classes
  const flexClass = isHebrew ? 'flex-row-reverse text-right' : 'flex-row text-left';
  const originClass = isHebrew ? 'origin-right' : 'origin-left';
  
  return (
    <Html
      position={position}
      distanceFactor={3.2}
      center
      className="pointer-events-none z-10"
    >
      <div className={`flex items-center gap-3 select-none ${flexClass}`}>
        
        {/* 1. HOTSPOT PULSING BUTTON */}
        <button
          onClick={() => setActiveHotspot(isActive ? null : id)}
          onPointerOver={(e) => {
            e.stopPropagation();
            setActiveHotspot(id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setActiveHotspot(null);
            document.body.style.cursor = 'auto';
          }}
          className={`w-[10px] h-[10px] rounded-full relative flex items-center justify-center transition-all duration-300 cursor-pointer pointer-events-auto border 
            ${isActive 
              ? 'bg-[#4ade80] border-[#4ade80] scale-125 shadow-[0_0_14px_rgba(74,222,128,0.65)]' 
              : 'bg-[#0a0d0c]/45 border-white/12 opacity-35 hover:opacity-100 hover:border-[#4ade80]'
            }`}
        >
          {/* Subtle Outer Pulse Ring */}
          <span className={`absolute inset-0 rounded-full bg-[#4ade80]/40 pointer-events-none transition-all duration-1000 
            ${isActive ? 'animate-ping scale-200' : 'scale-100 opacity-0'}`} />
          
          {/* Central Core */}
          <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-black' : 'bg-white/55'} transition-colors`} />
        </button>

        {/* 2. GLOWING CONNECTOR LINE */}
        <div
          className={`h-[1px] bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)] transition-all duration-500 ease-out ${originClass} 
            ${isActive ? 'w-16 scale-x-100 opacity-100' : 'w-0 scale-x-0 opacity-0'}`}
        />

        {/* 3. HARDWARE SPECIFICATION BLOCK */}
        <div
          className={`glassmorphism rounded-lg px-3.5 py-2.5 max-w-[200px] shadow-2xl transition-all duration-500 ease-out shrink-0
            ${isActive 
              ? 'translate-x-0 scale-100 opacity-100 pointer-events-auto' 
              : isHebrew 
                ? 'translate-x-5 scale-95 opacity-0' 
                : '-translate-x-5 scale-95 opacity-0'
            }`}
        >
          <div className="font-display font-bold text-[10.5px] tracking-wide text-white uppercase mb-1">
            {title}
          </div>
          <div className="font-sans text-[9px] text-gray-400 font-normal leading-relaxed">
            {description}
          </div>
          
          {/* technical hex code simulation */}
          <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/5 font-mono text-[7px] text-emerald-500/60 leading-none">
            <span>TX-0x{id.toUpperCase().substring(0, 4)}</span>
            <span>OK_STATUS</span>
          </div>
        </div>

      </div>
    </Html>
  );
};
