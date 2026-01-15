// @ts-ignore
import React from 'react';

interface PolandMapProps {
  onRegionClick: (regionName: string) => void;
}

export function PolandMapSVG({ onRegionClick }: PolandMapProps) {
  const regions = [
    { id: 'Zachodniopomorskie', d: "M50,50 L180,50 L180,180 L50,180 Z" },
    { id: 'Pomorskie', d: "M190,30 L320,30 L340,150 L190,150 Z" },
    { id: 'Warmińsko-Mazurskie', d: "M330,50 L480,50 L480,180 L330,180 Z" },
    { id: 'Podlaskie', d: "M490,80 L620,80 L620,250 L490,250 Z" },
    { id: 'Lubuskie', d: "M40,190 L140,190 L140,350 L40,350 Z" },
    { id: 'Wielkopolskie', d: "M150,190 L300,190 L300,350 L150,350 Z" },
    { id: 'Kujawsko-Pomorskie', d: "M280,160 L400,160 L400,260 L280,260 Z" },
    { id: 'Mazowieckie', d: "M410,190 L580,240 L550,420 L380,420 L350,280 Z" },
    { id: 'Lubelskie', d: "M520,400 L650,400 L650,580 L520,580 Z" },
    { id: 'Łódzkie', d: "M280,360 L380,360 L380,470 L280,470 Z" },
    { id: 'Dolnośląskie', d: "M100,360 L240,360 L240,500 L100,500 Z" },
    { id: 'Opolskie', d: "M210,510 L300,510 L300,600 L210,600 Z" },
    { id: 'Śląskie', d: "M310,480 L410,480 L410,620 L310,620 Z" },
    { id: 'Świętokrzyskie', d: "M420,430 L510,430 L510,540 L420,540 Z" },
    { id: 'Małopolskie', d: "M370,630 L500,630 L500,750 L370,750 Z" },
    { id: 'Podkarpackie', d: "M510,590 L640,590 L640,750 L510,750 Z" }
  ];

  return (
    <div className="bg-base-200 p-6 rounded-3xl shadow-inner flex flex-col items-center">
      <svg viewBox="0 0 700 800" className="w-full h-auto max-w-[500px]">
        <g className="cursor-pointer">
          {regions.map((reg) => (
            <path
              key={reg.id}
              d={reg.d}
              className="fill-slate-700 hover:fill-primary transition-all duration-300 stroke-base-100 stroke-2"
              onClick={() => onRegionClick(reg.id)}
            >
              <title>{reg.id}</title>
            </path>
          ))}
        </g>
      </svg>
      <div className="mt-4 badge badge-outline p-4 opacity-70 italic text-xs">
        * Kliknij w region, aby zobaczyć uczelnie
      </div>
    </div>
  );
}