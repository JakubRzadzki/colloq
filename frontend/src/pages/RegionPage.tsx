import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap, MapPin } from 'lucide-react';
import { getUniversities, API_URL } from '../utils/api';

// FIX: Add t prop
export function RegionPage({ t }: { t: any }) {
  const { regionName } = useParams();
  const { data: universities, isLoading } = useQuery({
    queryKey: ['universities'],
    queryFn: getUniversities
  });

  const filtered = universities?.filter(u => u.region === regionName);

  if (isLoading) return <div className="p-20 text-center"><span className="loading loading-spinner"></span></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in">
      <Link to="/" className="btn btn-ghost mb-8 gap-2"><ArrowLeft size={18}/> {t.home}</Link>

      <div className="mb-10">
        <h1 className="text-4xl font-black">Region: <span className="text-primary">{regionName}</span></h1>
        <p className="opacity-70 mt-2">Found {filtered?.length} universities in this region.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered?.map((u) => (
          <Link key={u.id} to={`/university/${u.id}`} className="card bg-base-100 shadow-xl border border-base-200 hover:border-primary transition-all group overflow-hidden">
            <figure className="h-48 relative">
              <img src={u.image_url ? `${API_URL}${u.image_url}` : "https://via.placeholder.com/400"} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <h3 className="absolute bottom-4 left-4 text-white font-bold text-xl pr-4">{u.name}</h3>
            </figure>
            <div className="card-body p-5">
               <div className="flex items-center gap-2 text-sm opacity-70">
                 <MapPin size={16}/> {u.city}
               </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="text-center py-20 opacity-50">
            <GraduationCap size={64} className="mx-auto mb-4"/>
            <p className="text-xl">No universities found in {regionName}.</p>
        </div>
      )}
    </div>
  );
}