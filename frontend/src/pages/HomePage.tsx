// src/pages/HomePage.tsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/api';
import { PolandMapSVG } from '../components/PolandMapSVG';

export function HomePage() {
  const navigate = useNavigate();

  const { data: unis, isLoading } = useQuery({
    queryKey: ['unis'],
    queryFn: () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  const handleRegionClick = (regionName: string) => {
    navigate(`/region/${regionName}`);
  };

  if (isLoading) return <div className="flex justify-center p-20"><span className="loading loading-lg"></span></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 text-center">
      <h1 className="text-5xl font-black mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Wybierz Województwo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <PolandMapSVG onRegionClick={handleRegionClick} />

        <div className="text-left space-y-6">
          <div className="stats stats-vertical shadow bg-base-200 w-full border border-base-300">
            <div className="stat">
              <div className="stat-title font-bold">Zindeksowane uczelnie</div>
              <div className="stat-value text-primary">{unis?.length || 0}</div>
              <div className="stat-desc opacity-60 italic">Dane pobrane lokalnie z Wikipedii</div>
            </div>
          </div>
          <div className="alert alert-info">
            <span>Kliknij w region na mapie, aby zobaczyć kafelki uczelni ze zdjęciami.</span>
          </div>
        </div>
      </div>
    </div>
  );
}