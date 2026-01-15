import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { University } from '../types';
import { API_URL } from '../utils/api';
import { PolandMapSVG } from '../components/PolandMapSVG';
import axios from 'axios';
import { Search, GraduationCap, MapPin } from 'lucide-react';

interface HomePageProps {
  t: any;
  lang: 'pl' | 'en';
}

/** * PRECYZYJNE ROZMIESZCZENIE PUNKTÓW NA MAPIE
 * Dostosowane do standardowego rzutu mapy Polski 300x350
 */
const REGION_CENTERS: Record<string, { x: number, y: number, color: string }> = {
  "Zachodniopomorskie": { x: 55, y: 90, color: "#EAB308" },
  "Pomorskie": { x: 140, y: 65, color: "#84CC16" },
  "Warmińsko-Mazurskie": { x: 220, y: 85, color: "#0EA5E9" },
  "Podlaskie": { x: 265, y: 145, color: "#06B6D4" },
  "Lubuskie": { x: 50, y: 185, color: "#F59E0B" },
  "Wielkopolskie": { x: 110, y: 195, color: "#22C55E" },
  "Kujawsko-Pomorskie": { x: 165, y: 150, color: "#10B981" },
  "Mazowieckie": { x: 220, y: 205, color: "#14B8A6" },
  "Łódzkie": { x: 165, y: 235, color: "#EF4444" },
  "Lubelskie": { x: 260, y: 265, color: "#8B5CF6" },
  "Dolnośląskie": { x: 85, y: 275, color: "#3B82F6" },
  "Opolskie": { x: 140, y: 290, color: "#F97316" },
  "Śląskie": { x: 175, y: 310, color: "#6366F1" },
  "Świętokrzyskie": { x: 215, y: 270, color: "#D946EF" },
  "Małopolskie": { x: 210, y: 325, color: "#EC4899" },
  "Podkarpackie": { x: 265, y: 325, color: "#8B5CF6" }
};

export default function HomePage({ t, lang }: HomePageProps) {
  const navigate = useNavigate();
  const [unis, setUnis] = useState<University[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnis = async () => {
      try {
        const resp = await axios.get(`${API_URL}/universities`, {
          params: { search: searchTerm }
        });
        setUnis(resp.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchUnis();
  }, [searchTerm]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    unis.forEach(uni => {
      if (uni.region) {
        counts[uni.region] = (counts[uni.region] || 0) + 1;
      }
    });
    return counts;
  }, [unis]);

  const getRegionDisplayName = (region: string) => {
    if (lang === 'pl') return region;
    const regionTranslations: Record<string, string> = {
      'Mazowieckie': 'Mazovia', 'Małopolskie': 'Lesser Poland', 'Śląskie': 'Silesia',
      'Wielkopolskie': 'Greater Poland', 'Dolnośląskie': 'Lower Silesia', 'Pomorskie': 'Pomerania',
      'Kujawsko-Pomorskie': 'Kuyavia-Pomerania', 'Łódzkie': 'Lodz Region', 'Lubelskie': 'Lublin Region',
      'Podkarpackie': 'Subcarpathia', 'Podlaskie': 'Podlaskie', 'Świętokrzyskie': 'Holy Cross',
      'Warmińsko-Mazurskie': 'Warmia-Masuria', 'Lubuskie': 'Lubusz', 'Opolskie': 'Opole Region',
      'Zachodniopomorskie': 'West Pomerania'
    };
    return regionTranslations[region] || region;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 animate-in fade-in duration-500">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic tracking-tighter">
          Colloq
        </h1>
        <div className="max-w-xl mx-auto relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary transition-colors" size={24} />
          <input
            className="input input-bordered input-lg w-full pl-14 rounded-full shadow-2xl focus:border-primary transition-all border-none bg-base-100"
            placeholder={t.homeSearchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* MAPA BEZ OBWÓDEK */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 px-4">
            <MapPin className="text-primary" /> {t.homeMapTitle}
          </h2>
          <PolandMapSVG
            onRegionClick={(region) => navigate(`/region/${region}`)}
            regionCounts={regionCounts}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            getRegionDisplayName={getRegionDisplayName}
            regionCenters={REGION_CENTERS}
          />
        </div>

        {/* LISTA WYNIKÓW */}
        <div className="space-y-6">
          <div className="stats shadow bg-base-100 w-full border-none">
            <div className="stat">
              <div className="stat-title font-bold uppercase text-xs opacity-60">{t.filters}</div>
              <div className="stat-value text-primary">{unis.length}</div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-base-200 bg-base-100 rounded-3xl shadow-2xl custom-scrollbar">
            {loading ? (
              <div className="p-20 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : unis.map(u => (
              <div key={u.id} onClick={() => navigate(`/university/${u.id}`)}
                className="p-5 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-6 group"
              >
                <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-105 transition-transform">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{lang === 'pl' ? u.name_pl : (u.name_en || u.name)}</h3>
                  <p className="text-xs font-bold opacity-50 uppercase tracking-widest">{u.city} • {getRegionDisplayName(u.region)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}