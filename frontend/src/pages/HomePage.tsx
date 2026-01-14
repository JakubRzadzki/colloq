import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { API_URL } from '../utils/api';

export function HomePage({ t }: { t: any }) {
  // Pobieramy uczelnie, żeby wyciągnąć unikalne województwa
  const { data: unis, isLoading } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  // Tworzymy listę unikalnych regionów
  // @ts-ignore
    const regions = [...new Set(unis?.map((u: any) => u.region))].filter(Boolean).sort() as string[];

  if (isLoading) return <div className="text-center mt-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="py-10">
      <h1 className="text-4xl font-bold text-center mb-2">Wybierz Region</h1>
      <p className="text-center text-gray-500 mb-10">Znajdź swoją uczelnię przeglądając województwa</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {regions.map((region) => (
          <Link
            key={region}
            to={`/region/${region}`}
            className="card bg-base-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-base-200 cursor-pointer group"
          >
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                <MapPin size={32} />
              </div>
              <h2 className="card-title text-xl">{region}</h2>
              <p className="text-xs text-gray-400">Zobacz uczelnie &rarr;</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}