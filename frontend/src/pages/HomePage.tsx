import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Building2, PlusCircle } from 'lucide-react';
import { getUniversities } from '../utils/api';
import { University } from '../types';
import { AddUniversityModal } from '../components/AddUniversityModal';

interface Props {
  t: any;
  lang: string;
}

export default function HomePage({ t, lang }: Props) {
  const [search, setSearch] = useState("");
  const [isAddUniOpen, setAddUniOpen] = useState(false);

  // Check if the user is logged in (if token exists)
  const token = localStorage.getItem('token');

  const { data: universities, isLoading, error } = useQuery<University[]>({
    queryKey: ['universities'],
    queryFn: getUniversities,
  });

  // Filter universities by name or city
  const filteredUniversities = universities?.filter(uni =>
    uni.name.toLowerCase().includes(search.toLowerCase()) ||
    uni.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500">

      {/* --- HERO SECTION --- */}
      <section className="text-center space-y-6 py-12 px-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Colloq PRO
        </h1>
        <p className="text-xl text-base-content/70 max-w-2xl mx-auto leading-relaxed">
          {t.hero_subtitle}
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-base-content/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder={t.search_placeholder}
            className="input input-lg w-full pl-12 shadow-lg border-base-300 focus:border-primary transition-all bg-base-100/80 backdrop-blur-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* --- ADD UNIVERSITY BUTTON (NEW ELEMENT) --- */}
        <div className="flex flex-col items-center gap-4 pt-4">
          {token ? (
            <button
              onClick={() => setAddUniOpen(true)}
              className="btn btn-outline btn-sm md:btn-md gap-2 rounded-full hover:bg-base-200 border-base-300"
            >
              <PlusCircle size={18} />
              {lang === 'pl' ? 'Nie widzisz swojej uczelni? Dodaj ją!' : 'Missing university? Add it!'}
            </button>
          ) : (
            <p className="text-xs md:text-sm opacity-50 italic">
              {lang === 'pl'
                ? 'Zaloguj się, aby zgłosić nową uczelnię.'
                : 'Login to request a new university.'}
            </p>
          )}
        </div>
      </section>

      {/* --- UNIVERSITIES LIST --- */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error max-w-md mx-auto shadow-lg">
            <span>{t.error_loading_data}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-8 border-b border-base-200 pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="text-primary" />
                {t.available_universities}
              </h2>
              <span className="text-sm opacity-60">
                {filteredUniversities?.length} {lang === 'pl' ? 'wyników' : 'results'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUniversities?.map((uni) => (
                <Link
                  to={`/university/${uni.id}`}
                  key={uni.id}
                  className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 group border border-base-200 hover:border-primary/30 overflow-hidden"
                >
                  <figure className="h-40 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                    <img
                      src={uni.image_url || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80"}
                      alt={uni.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-3 left-4 right-4 z-20">
                      <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">
                        {uni.name}
                      </h3>
                    </div>
                  </figure>
                  <div className="card-body p-5">
                    <div className="flex items-center gap-2 text-sm text-base-content/70 mb-4">
                      <MapPin size={16} className="text-secondary" />
                      {uni.city}, {uni.region}
                    </div>
                    <div className="card-actions justify-end mt-auto">
                      <button className="btn btn-primary btn-sm btn-ghost gap-1 group-hover:pr-2 transition-all">
                        {t.view_notes} <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredUniversities?.length === 0 && (
              <div className="text-center py-20 opacity-60">
                <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg">
                  {lang === 'pl' ? 'Nie znaleziono uczelni.' : 'No universities found.'}
                </p>
                {token && (
                   <button
                     onClick={() => setAddUniOpen(true)}
                     className="btn btn-link mt-2"
                   >
                     {lang === 'pl' ? 'Dodaj ją teraz' : 'Add it now'}
                   </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* --- ADD UNIVERSITY MODAL --- */}
      <AddUniversityModal
        isOpen={isAddUniOpen}
        onClose={() => setAddUniOpen(false)}
      />
    </div>
  );
}