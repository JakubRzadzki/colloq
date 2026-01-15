import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../utils/api';

export function RegionPage() {
  const { regionName } = useParams();
  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });
  const filtered = unis?.filter((u: any) => u.region === regionName);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-8">Uczelnie: {regionName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filtered?.map((u: any) => (
          <Link key={u.id} to={`/university/${u.id}`} className="card bg-base-100 shadow-xl image-full">
            <figure><img src={u.image_url} alt={u.name_pl} /></figure>
            <div className="card-body">
              <h2 className="card-title">{u.name_pl}</h2>
              <div className="card-actions justify-end"><button className="btn btn-primary">Zobacz</button></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}