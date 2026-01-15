import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, GraduationCap, TrendingUp } from 'lucide-react';
import { API_URL } from '../utils/api';

interface University {
  id: number;
  name: string;
  name_pl: string;
  name_en: string;
  city: string;
  region: string;
  image_url: string;
}

export default function HomePage({ t, lang }: { t: any; lang: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: universities } = useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/universities`);
      return res.data as University[];
    }
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => axios.get(`${API_URL}/leaderboard`).then(r => r.data)
  });

  // Group universities by region
  const regions = universities?.reduce((acc: any, uni: University) => {
    if (!acc[uni.region]) {
      acc[uni.region] = [];
    }
    acc[uni.region].push(uni);
    return acc;
  }, {});

  // Filter universities based on search
  const filteredUniversities = universities?.filter((uni: University) => {
    const q = searchQuery.toLowerCase();
    return (
      uni.name_pl?.toLowerCase().includes(q) ||
      uni.name_en?.toLowerCase().includes(q) ||
      uni.city?.toLowerCase().includes(q) ||
      uni.region?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-12 pb-8">
        <div className="inline-block">
          <h1 className="text-7xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Colloq
          </h1>
          <div className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full mt-2"></div>
        </div>
        <p className="text-xl opacity-70 max-w-2xl mx-auto">
          {lang === 'pl'
            ? 'Platforma współdzielenia wiedzy dla studentów. Znajdź materiały, dziel się notatkami, rozwijaj się razem.'
            : 'Knowledge sharing platform for students. Find materials, share notes, grow together.'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors" size={24} />
          <input
            type="text"
            placeholder={lang === 'pl' ? 'Szukaj uczelni, miast lub województw...' : 'Search universities, cities or regions...'}
            className="input input-bordered w-full pl-16 pr-6 h-16 text-lg rounded-2xl shadow-lg focus:shadow-xl focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat bg-base-100 rounded-2xl shadow-lg border border-base-300">
          <div className="stat-figure text-primary">
            <MapPin size={40} />
          </div>
          <div className="stat-title">{lang === 'pl' ? 'Województwa' : 'Regions'}</div>
          <div className="stat-value text-primary">{Object.keys(regions || {}).length}</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl shadow-lg border border-base-300">
          <div className="stat-figure text-secondary">
            <GraduationCap size={40} />
          </div>
          <div className="stat-title">{lang === 'pl' ? 'Uczelnie' : 'Universities'}</div>
          <div className="stat-value text-secondary">{universities?.length || 0}</div>
        </div>

        <div className="stat bg-base-100 rounded-2xl shadow-lg border border-base-300">
          <div className="stat-figure text-accent">
            <TrendingUp size={40} />
          </div>
          <div className="stat-title">{lang === 'pl' ? 'Aktywni użytkownicy' : 'Active users'}</div>
          <div className="stat-value text-accent">{leaderboard?.length || 0}</div>
        </div>
      </div>

      {/* Universities Grid or Regions */}
      {searchQuery ? (
        // Filtered Results
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {lang === 'pl' ? 'Wyniki wyszukiwania' : 'Search Results'} ({filteredUniversities?.length || 0})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUniversities?.map((uni) => (
              <div
                key={uni.id}
                onClick={() => navigate(`/university/${uni.id}`)}
                className="card bg-base-100 shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-base-300 hover:border-primary overflow-hidden group"
              >
                <figure className="h-48 relative overflow-hidden">
                  <img
                    src={uni.image_url}
                    alt={uni.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg line-clamp-2">
                      {lang === 'pl' ? uni.name_pl : uni.name_en}
                    </h3>
                  </div>
                </figure>
                <div className="card-body p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-primary" />
                    <span className="font-semibold">{uni.city}</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-70">{uni.region}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Browse by Region
        <div>
          <h2 className="text-3xl font-bold mb-6">
            {lang === 'pl' ? 'Przeglądaj według województw' : 'Browse by Region'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(regions || {}).map(([regionName, unis]: [string, any]) => (
              <div
                key={regionName}
                onClick={() => navigate(`/region/${regionName}`)}
                className="card bg-gradient-to-br from-base-100 to-base-200 shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-base-300 hover:border-primary group"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="card-title text-xl mb-2 group-hover:text-primary transition-colors">
                        {regionName}
                      </h3>
                      <p className="text-sm opacity-70">
                        {unis.length} {lang === 'pl' ? 'uczelni' : 'universities'}
                      </p>
                    </div>
                    <div className="badge badge-primary badge-lg">{unis.length}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {unis.slice(0, 3).map((uni: University) => (
                      <div key={uni.id} className="badge badge-outline badge-sm">
                        {uni.city}
                      </div>
                    ))}
                    {unis.length > 3 && (
                      <div className="badge badge-outline badge-sm opacity-50">
                        +{unis.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <TrendingUp className="text-primary" />
              {lang === 'pl' ? 'Najbardziej aktywni' : 'Top Contributors'}
            </h2>
            <div className="space-y-3">
              {leaderboard.map((user: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-base-200 rounded-lg">
                  <div className={`badge ${index === 0 ? 'badge-warning' : index === 1 ? 'badge-info' : index === 2 ? 'badge-accent' : 'badge-ghost'} font-bold text-lg`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{user.name}</div>
                    {user.is_verified && (
                      <div className="badge badge-primary badge-xs">Zweryfikowany</div>
                    )}
                  </div>
                  <div className="badge badge-lg">{user.count} {lang === 'pl' ? 'notatek' : 'notes'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}