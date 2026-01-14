import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { API_URL, getAuthHeader } from '../utils/api';

export function AdminPage({ t }: { t: any }) {
  const queryClient = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ['pending'],
    queryFn: async () => axios.get(`${API_URL}/admin/pending_notes`, { headers: getAuthHeader() }).then(r => r.data)
  });

  const approve = (id: number) => {
    axios.post(`${API_URL}/admin/approve/${id}`, {}, { headers: getAuthHeader() })
      .then(() => queryClient.invalidateQueries({ queryKey: ['pending'] }));
  };

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShieldCheck/> {t.adminTitle}</h2>
      {pending?.length === 0 ? <p className="opacity-50 italic">{t.noPending}</p> : (
        <div className="grid gap-4">
          {pending?.map((n: any) => (
            <div key={n.id} className="alert flex-col md:flex-row items-start md:items-center gap-4 border-l-4 border-warning">
              <div className="flex-1">
                <h3 className="font-bold">{n.title}</h3>
                <div className="text-xs opacity-70 mb-2">{n.content}</div>
                {n.image_url && <a href={`${API_URL}${n.image_url}`} target="_blank" className="link link-primary text-xs">{t.viewImage}</a>}
              </div>
              <button onClick={() => approve(n.id)} className="btn btn-sm btn-success text-white">{t.approveBtn}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}