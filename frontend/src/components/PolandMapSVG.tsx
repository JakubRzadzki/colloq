import React from 'react';

interface MapProps {
  onRegionClick: (region: string) => void;
  regionCounts: Record<string, number>;
  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;
  getRegionDisplayName: (region: string) => string;
  regionCenters: Record<string, { x: number, y: number, color: string }>;
}

export function PolandMapSVG({
  onRegionClick,
  regionCounts,
  selectedRegion,
  setSelectedRegion,
  getRegionDisplayName,
  regionCenters
}: MapProps) {
  return (
    // USUNIĘTO WSZYSTKIE OBRAMOWANIA (border-none)
    <div className="relative w-full h-[520px] rounded-[2.5rem] overflow-hidden bg-transparent">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 350"
        preserveAspectRatio="xMidYMid meet"
        className="drop-shadow-sm"
      >
        <image
          href="/poland_map.jpg"
          x="0" y="0" width="300" height="350"
          style={{ opacity: 1 }}
        />

        {Object.keys(regionCenters).map((region) => {
          const center = regionCenters[region];
          const count = regionCounts[region] || 0;
          if (count === 0) return null;

          const isSelected = selectedRegion === region;
          const radius = 9 + Math.min(count, 12) * 1.2;

          return (
            <g
              key={region}
              className="cursor-pointer group"
              onMouseEnter={() => setSelectedRegion(region)}
              onMouseLeave={() => setSelectedRegion(null)}
              onClick={() => onRegionClick(region)}
            >
              {/* Efekt poświaty bez ostrej krawędzi */}
              <circle
                cx={center.x} cy={center.y} r={radius + 6}
                fill={center.color}
                className={`transition-all duration-700 ${isSelected ? 'opacity-20 animate-pulse' : 'opacity-0'}`}
              />

              {/* Punkt główny - USUNIĘTO STROKE (białą obwódkę) */}
              <circle
                cx={center.x} cy={center.y} r={radius}
                fill={center.color}
                fillOpacity={isSelected ? 1 : 0.8}
                className="transition-all duration-300 shadow-lg"
              />

              <text
                x={center.x} y={center.y}
                textAnchor="middle" dy="0.35em"
                className="text-[9px] font-black fill-white pointer-events-none drop-shadow-sm"
              >
                {count}
              </text>

              {/* Minimalistyczny tooltip */}
              {isSelected && (
                <foreignObject
                  x={center.x - 50} y={center.y - radius - 28}
                  width="100" height="25"
                >
                  <div className="flex justify-center animate-in fade-in zoom-in duration-200">
                    <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap backdrop-blur-md">
                      {getRegionDisplayName(region)}
                    </div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}