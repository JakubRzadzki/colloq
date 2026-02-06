import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { getUniversities, API_URL } from '../utils/api'; // Teraz API_URL zadziała

// Typy (opcjonalnie przenieś do types.ts)
interface University {
  id: number;
  name: string;
  city: string;
  region: string;
  image_url?: string;
}

export default function HomePage({ t }: { t: any }) {
  const [search, setSearch] = useState("");

  // Pobieranie danych z użyciem React Query
  const { data: universities, isLoading } = useQuery<University[]>({
    queryKey: ['universities'],
    queryFn: getUniversities
  });

  // Logika filtrowania (Live Search)
  const filtered = search.length > 0
    ? universities?.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.city.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen pt-32 px-4 relative overflow-hidden">
      {/* --- TŁO: Animowane Orby (Deep Aurora) --- */}
      <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-[#5e5ce6]/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#32ade6]/20 rounded-full blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto text-center relative z-10">

        {/* HERO TITLE */}
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-8
                       bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent drop-shadow-lg">
          Colloq
        </h1>

        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          {t?.heroSubtitle || "Join the largest student community. Share knowledge, pass exams."}
        </p>

        {/* --- LIVE SEARCH ISLAND --- */}
        <div className="max-w-2xl mx-auto relative group z-50">
          {/* Glow effect under input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder={t?.searchPlaceholder || "Search for universities..."}
              className="w-full bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#5e5ce6]/50 shadow-2xl transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* DROPDOWN WYNIKÓW */}
          {search.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-4 bg-[#1e1e23]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 max-h-96 overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-top-2">
              {filtered && filtered.length > 0 ? (
                filtered.map(uni => (
                  <Link
                    to={`/university/${uni.id}`}
                    key={uni.id}
                    className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-xl transition-all group"
                  >
                    <img
                      src={uni.image_url ? `${API_URL}${uni.image_url}` : "https://via.placeholder.com/50"}
                      alt={uni.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/5"
                    />
                    <div className="text-left flex-1">
                      <h4 className="font-bold text-white group-hover:text-[#32ade6] transition-colors">{uni.name}</h4>
                      <span className="text-xs text-white/50 flex items-center gap-1">
                        <MapPin size={12}/> {uni.city}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                  </Link>
                ))
              ) : (
                <div className="p-4 text-white/40 text-sm">No results found for "{search}"</div>
              )}
            </div>
          )}
        </div>

        {/* --- STATS GRID (Glassmorphism) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 px-4">
            <StatsCard
              icon={<Building2 className="text-[#5e5ce6]" size={32}/>}
              value={universities?.length || 0}
              label="Universities"
            />
            <StatsCard
              icon={<MapPin className="text-[#ff2d92]" size={32}/>}
              value="16"
              label="Regions"
            />
             <StatsCard
              icon={<TrendingUp className="text-[#32ade6]" size={32}/>}
              value="Live"
              label="Data Feed"
            />
        </div>
      </div>
    </div>
  );
}

// Komponent pomocniczy dla kart statystyk
function StatsCard({ icon, value, label }: { icon: any, value: string | number, label: string }) {
  return (
    <div className="bg-[#1e1e23]/30 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-[#1e1e23]/50 transition-all hover:scale-[1.02] hover:border-[#5e5ce6]/30 group cursor-default">
      <div className="mb-4 bg-white/5 w-fit p-3 rounded-2xl group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-4xl font-black text-white mb-1">{value}</h3>
      <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}