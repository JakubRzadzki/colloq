// @ts-ignore
import React from 'react';

interface PolandMapProps {
  onRegionClick: (regionName: string) => void;
}

export function PolandMapSVG({ onRegionClick }: PolandMapProps) {
  const regions = [
    { id: 'Zachodniopomorskie', label: 'Szczecin', d: "M50,50 L180,50 L180,180 L50,180 Z", x: 70, y: 120 },
    { id: 'Pomorskie', label: 'Gdańsk', d: "M190,30 L320,30 L340,150 L190,150 Z", x: 230, y: 100 },
    { id: 'Warmińsko-Mazurskie', label: 'Olsztyn', d: "M330,50 L480,50 L480,180 L330,180 Z", x: 360, y: 120 },
    { id: 'Podlaskie', label: 'Białystok', d: "M490,80 L620,80 L620,250 L490,250 Z", x: 510, y: 170 },
    { id: 'Lubuskie', label: 'Zielona Góra', d: "M40,190 L140,190 L140,350 L40,350 Z", x: 50, y: 280 },
    { id: 'Wielkopolskie', label: 'Poznań', d: "M150,190 L300,190 L300,350 L150,350 Z", x: 190, y: 280 },
    { id: 'Kujawsko-Pomorskie', label: 'Bydgoszcz', d: "M280,160 L400,160 L400,260 L280,260 Z", x: 300, y: 220 },
    { id: 'Mazowieckie', label: 'Warszawa', d: "M410,190 L580,240 L550,420 L380,420 L350,280 Z", x: 440, y: 320 },
    { id: 'Dolnośląskie', label: 'Wrocław', d: "M100,360 L240,360 L240,500 L100,500 Z", x: 130, y: 440 },
    { id: 'Łódzkie', label: 'Łódź', d: "M280,360 L380,360 L380,470 L280,470 Z", x: 310, y: 430 },
    { id: 'Lubelskie', label: 'Lublin', d: "M520,400 L650,400 L650,580 L520,580 Z", x: 550, y: 500 },
    { id: 'Opolskie', label: 'Opole', d: "M210,510 L300,510 L300,600 L210,600 Z", x: 230, y: 560 },
    { id: 'Śląskie', label: 'Katowice', d: "M310,480 L410,480 L410,620 L310,620 Z", x: 330, y: 560 },
    { id: 'Świętokrzyskie', label: 'Kielce', d: "M420,430 L510,430 L510,540 L420,540 Z", x: 430, y: 490 },
    { id: 'Małopolskie', label: 'Kraków', d: "M370,630 L500,630 L500,750 L370,750 Z", x: 400, y: 700 },
    { id: 'Podkarpackie', label: 'Rzeszów', d: "M510,590 L640,590 L640,750 L510,750 Z", x: 540, y: 680 },
  ];

  return (
    <div className="bg-base-100 p-8 rounded-3xl border border-base-300 shadow-inner">
      <svg viewBox="0 0 700 800" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
        <g className="cursor-pointer">
          {regions.map((reg) => (
            <React.Fragment key={reg.id}>
              <path
                d={reg.d}
                className="fill-slate-700 hover:fill-primary transition-all duration-300 stroke-base-100 stroke-2"
                onClick={() => onRegionClick(reg.id)}
              />
              <text x={reg.x} y={reg.y} className="pointer-events-none fill-white font-bold text-[12px] uppercase tracking-tighter opacity-80">
                {reg.label}
              </text>
            </React.Fragment>
          ))}
        </g>
      </svg>
      <div className="mt-6 text-center text-xs opacity-50 italic">
        * Mapa interaktywna: kliknij w miasto swojej uczelni
      </div>
    </div>
  );
}