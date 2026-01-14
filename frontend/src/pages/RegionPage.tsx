import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { API_URL } from '../utils/api';

export function RegionPage({ t, lang }: { t: any, lang: string }) {
  const { regionName } = useParams();

  const { data: unis, isLoading } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  // Filtrujemy uczelnie z tego regionu
  // @ts-ignore
  const regionUnis = unis?.filter((u: any) => u.region === regionName);

  if (isLoading) return <div className="text-center mt-10"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="py-8">
      <Link to="/" className="btn btn-ghost gap-2 mb-6"><ArrowLeft size={18}/> Wróć do mapy</Link>

      <h1 className="text-3xl font-bold mb-8 text-center">Uczelnie w: <span className="text-primary">{regionName}</span></h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regionUnis?.map((u: any) => (
          <Link
            key={u.id}
            to={`/university/${u.id}`}
            className="card bg-base-100 shadow-lg hover:shadow-xl hover:border-primary border border-base-200 transition-all"
          >
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="bg-secondary/10 p-3 rounded-lg text-secondary">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{lang === 'pl' ? u.name_pl : u.name_en}</h3>
                  <div className="badge badge-ghost badge-sm mt-2">{regionName}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {regionUnis?.length === 0 && (
        <div className="text-center opacity-50">Brak uczelni w tym regionie w naszej bazie.</div>
      )}
    </div>
  );
}