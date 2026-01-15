import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { University } from '../types';
import { getUniversities } from '../utils/api';

interface HomePageProps {
  t: any;
  lang: 'pl' | 'en';
}

// Poprawione dane mapy Polski - prostszy kontur
const POLAND_MAP_DATA = [
  { x: 50, y: 100 },   // NW
  { x: 150, y: 50 },   // N
  { x: 250, y: 60 },   // NE
  { x: 300, y: 150 },  // E
  { x: 280, y: 250 },  // SE
  { x: 200, y: 300 },  // S
  { x: 100, y: 280 },  // SW
  { x: 50, y: 200 },   // W
  { x: 50, y: 100 },   // Zamknięcie
];

// Centra regionów - współrzędne dostosowane do SVG
const REGION_CENTERS: Record<string, { x: number, y: number, color: string }> = {
  "Zachodniopomorskie": { x: 80, y: 80, color: "#EAB308" },
  "Pomorskie": { x: 120, y: 100, color: "#84CC16" },
  "Warmińsko-Mazurskie": { x: 180, y: 120, color: "#0EA5E9" },
  "Podlaskie": { x: 220, y: 140, color: "#06B6D4" },
  "Lubuskie": { x: 70, y: 150, color: "#F59E0B" },
  "Wielkopolskie": { x: 120, y: 170, color: "#22C55E" },
  "Kujawsko-Pomorskie": { x: 160, y: 150, color: "#10B981" },
  "Mazowieckie": { x: 190, y: 180, color: "#14B8A6" },
  "Łódzkie": { x: 140, y: 200, color: "#EF4444" },
  "Dolnośląskie": { x: 110, y: 220, color: "#3B82F6" },
  "Opolskie": { x: 140, y: 230, color: "#F97316" },
  "Śląskie": { x: 160, y: 220, color: "#6366F1" },
  "Świętokrzyskie": { x: 180, y: 210, color: "#D946EF" },
  "Lubelskie": { x: 220, y: 190, color: "#8B5CF6" },
  "Podkarpackie": { x: 200, y: 250, color: "#8B5CF6" },
  "Małopolskie": { x: 170, y: 240, color: "#EC4899" }
};

const HomePage: React.FC<HomePageProps> = ({ t, lang }) => {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({});
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    loadUniversities();
  }, []);

  useEffect(() => {
    const counts: Record<string, number> = {};
    universities.forEach(uni => {
      counts[uni.region] = (counts[uni.region] || 0) + 1;
    });
    setRegionCounts(counts);
  }, [universities]);

  const loadUniversities = async () => {
    try {
      const data = await getUniversities();
      setUniversities(data);
    } catch (error) {
      console.error('Error loading universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPathData = () => {
    return POLAND_MAP_DATA.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ') + ' Z';
  };

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUniversityName = (uni: University) => {
    return lang === 'pl' ? uni.name_pl : uni.name_en || uni.name;
  };

  const getRegionDisplayName = (region: string) => {
    if (lang === 'pl') return region;

    const translations: Record<string, string> = {
      'Mazowieckie': 'Mazovia',
      'Małopolskie': 'Lesser Poland',
      'Śląskie': 'Silesia',
      'Wielkopolskie': 'Greater Poland',
      'Dolnośląskie': 'Lower Silesia',
      'Pomorskie': 'Pomerania',
      'Kujawsko-Pomorskie': 'Kuyavian-Pomeranian',
      'Łódzkie': 'Łódź',
      'Lubelskie': 'Lublin',
      'Podkarpackie': 'Subcarpathia',
      'Podlaskie': 'Podlaskie',
      'Świętokrzyskie': 'Holy Cross',
      'Warmińsko-Mazurskie': 'Warmia-Masuria',
      'Lubuskie': 'Lubusz',
      'Opolskie': 'Opole',
      'Zachodniopomorskie': 'West Pomerania'
    };

    return translations[region] || region;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Nagłówek z wyszukiwarką */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t.homeTitle}</h1>
        <p className="text-lg text-gray-600 mb-6">{t.homeSubtitle}</p>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder={t.homeSearchPlaceholder}
              className="w-full px-6 py-3 text-lg border-2 border-primary rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-3 top-3">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kontener z mapą i listą */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mapa Polski */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">{t.homeMapTitle}</h2>

          <div className="relative w-full h-[500px] bg-base-200 rounded-xl overflow-hidden border-2 border-base-300">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 300 350"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Tło */}
              <rect width="100%" height="100%" fill="#f0f9ff" />

              {/* Kontur Polski - prostszy */}
              <path
                d={createPathData()}
                fill="#dbeafe"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Punkty dla regionów */}
              {Object.keys(REGION_CENTERS).map((region) => {
                const center = REGION_CENTERS[region];
                const count = regionCounts[region] || 0;
                if (count === 0) return null;

                const isSelected = selectedRegion === region;
                const radius = 10 + Math.min(count, 5) * 3;

                return (
                  <g
                    key={region}
                    className="transition-all duration-200"
                    onMouseEnter={() => setSelectedRegion(region)}
                    onMouseLeave={() => setSelectedRegion(null)}
                  >
                    {/* Kółko z cieniem */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radius}
                      fill={center.color}
                      fillOpacity={isSelected ? 0.8 : 0.6}
                      stroke="white"
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer hover:fill-opacity-90"
                      onClick={() => navigate(`/region/${region}`)}
                    />

                    {/* Liczba uczelni */}
                    <text
                      x={center.x}
                      y={center.y}
                      textAnchor="middle"
                      dy="0.3em"
                      className="text-xs font-bold fill-white pointer-events-none"
                    >
                      {count}
                    </text>

                    {/* Etykieta regionu (pokazuj tylko przy hover) */}
                    {isSelected && (
                      <g>
                        <rect
                          x={center.x - 40}
                          y={center.y - radius - 25}
                          width={80}
                          height={20}
                          rx={4}
                          fill="#1f2937"
                          fillOpacity="0.9"
                        />
                        <text
                          x={center.x}
                          y={center.y - radius - 12}
                          textAnchor="middle"
                          className="text-xs font-semibold fill-white"
                        >
                          {getRegionDisplayName(region)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nazwy głównych miast */}
              <text x="120" y="110" className="text-xs font-medium fill-gray-700">Gdańsk</text>
              <text x="180" y="130" className="text-xs font-medium fill-gray-700">Olsztyn</text>
              <text x="220" y="150" className="text-xs font-medium fill-gray-700">Białystok</text>
              <text x="190" y="190" className="text-xs font-medium fill-gray-700">Warszawa</text>
              <text x="140" y="210" className="text-xs font-medium fill-gray-700">Wrocław</text>
              <text x="170" y="240" className="text-xs font-medium fill-gray-700">Kraków</text>
            </svg>

            {/* Legenda */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-base-300">
              <h3 className="font-bold text-sm mb-2">{t.homeLegend}</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REGION_CENTERS).slice(0, 4).map(([region, data]) => (
                  <div key={region} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="text-xs truncate max-w-[60px]">{region}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-base-300">
                <div className="flex items-center justify-between text-xs">
                  <span>Kliknij na region:</span>
                  <span className="font-semibold text-primary">Lista uczelni</span>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-base-300">
              <div className="text-xs space-y-1">
                <div className="font-semibold">ℹ️ {t.homeMapInfo || "Informacja"}</div>
                <div>Rozmiar kółka = liczba uczelni</div>
                <div className="text-gray-500">Najwięcej: {Math.max(...Object.values(regionCounts))}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista uczelni */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{t.homeUniversitiesList}</h2>
            <span className="badge badge-primary">
              {filteredUniversities.length} {t.homeUniversities}
            </span>
          </div>

          <div className="space-y-4 max-h-[430px] overflow-y-auto pr-2">
            {filteredUniversities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t.homeNoResults}
              </div>
            ) : (
              filteredUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="card card-side bg-base-200 shadow hover:shadow-md transition-shadow cursor-pointer hover:bg-base-300"
                  onClick={() => navigate(`/university/${uni.id}`)}
                >
                  <figure className="w-24 min-w-24">
                    <img
                      src={uni.image_url || '/university-placeholder.png'}
                      alt={getUniversityName(uni)}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/university-placeholder.png';
                      }}
                    />
                  </figure>
                  <div className="card-body p-4">
                    <h3 className="card-title text-lg">{getUniversityName(uni)}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="badge badge-outline">{uni.city}</span>
                      <span
                        className="badge badge-ghost cursor-pointer hover:bg-primary hover:text-primary-content"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/region/${uni.region}`);
                        }}
                      >
                        {uni.region}
                      </span>
                      <span className={`badge ${
                        uni.type === 'Publiczna' ? 'badge-primary' : 
                        uni.type === 'Prywatna' ? 'badge-secondary' : 'badge-accent'
                      }`}>
                        {uni.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Statystyki */}
          <div className="mt-6 pt-4 border-t border-base-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="stat-title text-xs">{t.homeTotalRegions || "Regiony"}</div>
                <div className="stat-value text-lg text-primary">
                  {Object.keys(regionCounts).length}
                </div>
              </div>
              <div className="text-center">
                <div className="stat-title text-xs">{t.homeTotalUniversities || "Uczelnie"}</div>
                <div className="stat-value text-lg text-secondary">{universities.length}</div>
              </div>
              <div className="text-center">
                <div className="stat-title text-xs">{t.homeMostUniversities || "Najwięcej"}</div>
                <div className="stat-value text-sm font-bold">
                  {(() => {
                    const entries = Object.entries(regionCounts);
                    if (entries.length === 0) return '-';
                    entries.sort((a, b) => b[1] - a[1]);
                    return `${entries[0][0]} (${entries[0][1]})`;
                  })()}
                </div>
              </div>
              <div className="text-center">
                <div className="stat-title text-xs">{t.homePublicUniversities || "Publiczne"}</div>
                <div className="stat-value text-lg text-accent">
                  {universities.filter(u => u.type === 'Publiczna').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;