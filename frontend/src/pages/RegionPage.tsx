import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { ArrowLeft, GraduationCap } from 'lucide-react';

interface RegionPageProps {
  t: any;
  lang: string;
}

export function RegionPage({ t, lang }: RegionPageProps) {
  const { regionName } = useParams();
  const { data: unis, isLoading } = useQuery({
    queryKey: ['unis'],
    queryFn: () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  const filtered = unis?.filter((u: any) => u.region === regionName);

  if (isLoading) return <div className="p-20 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/" className="btn btn-ghost mb-8 gap-2"><ArrowLeft size={18}/> {t.home}</Link>
      <h1 className="text-4xl font-black mb-10">
        {lang === 'pl' ? 'Województwo' : 'Region'}: <span className="text-primary">{regionName}</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered?.map((u: any) => (
          <Link key={u.id} to={`/university/${u.id}`} className="card bg-base-100 shadow-xl border border-base-300 hover:border-primary transition-all overflow-hidden group">
            <figure className="h-48 relative">
              <img src={u.image_url} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <h2 className="absolute bottom-4 left-4 text-white font-bold text-xl px-2">
                {lang === 'pl' ? (u.name_pl || u.name) : (u.name_en || u.name)}
              </h2>
            </figure>
            <div className="card-body p-5 flex-row items-center gap-3">
               <GraduationCap size={20} className="text-primary" />
               <p className="text-sm opacity-70 font-bold uppercase tracking-widest">{u.city}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}