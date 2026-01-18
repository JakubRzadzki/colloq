import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Building2, PlusCircle } from 'lucide-react';
import { getUniversities, API_URL } from '../utils/api';
import { AddUniversityModal } from '../components/AddUniversityModal';

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [isAddUniOpen, setAddUniOpen] = useState(false);
  const token = localStorage.getItem('token');

  const { data: universities } = useQuery({ queryKey: ['universities'], queryFn: getUniversities });
  const filtered = universities?.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.city.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <section className="text-center py-20 px-4 bg-gradient-to-b from-base-200 to-base-100">
        <h1 className="text-6xl font-black mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Colloq PRO</h1>
        <p className="text-xl opacity-70 mb-8 max-w-2xl mx-auto">Crowdsourced educational platform. Find notes, share knowledge, vote for the best content.</p>
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"/>
          <input type="text" placeholder="Search university..." className="input input-lg w-full pl-12 shadow-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="mt-6">
            {token ? <button onClick={() => setAddUniOpen(true)} className="btn btn-outline gap-2 rounded-full"><PlusCircle size={18}/> Missing University?</button> : <p className="text-sm opacity-50">Login to add universities</p>}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold mb-6 flex gap-2 items-center"><Building2 className="text-primary"/> Available Universities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered?.map(uni => (
                <Link to={`/university/${uni.id}`} key={uni.id} className="card bg-base-100 shadow-lg hover:shadow-2xl transition-all group overflow-hidden border border-base-200">
                    <figure className="h-40 relative">
                        <img src={uni.image_url ? `${API_URL}${uni.image_url}` : "https://via.placeholder.com/400"} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        <div className="absolute inset-0 bg-black/40 flex items-end p-4"><h3 className="text-white font-bold text-lg">{uni.name}</h3></div>
                    </figure>
                    <div className="card-body p-4 flex-row justify-between items-center">
                        <span className="text-sm flex gap-1 items-center"><MapPin size={14}/> {uni.city}</span>
                        <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition-transform"/>
                    </div>
                </Link>
            ))}
        </div>
      </section>
      <AddUniversityModal isOpen={isAddUniOpen} onClose={() => setAddUniOpen(false)}/>
    </div>
  );
}