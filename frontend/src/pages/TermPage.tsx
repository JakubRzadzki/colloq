import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, BookOpen, GraduationCap, ArrowRight, Library, Building2 } from 'lucide-react';
import { globalSearch } from '../utils/api';

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface TermPageProps {
  t: any;
}

export function TermPage({ t }: TermPageProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounceValue(query, 500);

  const { data: results, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.length > 1
  });

  return (
    <div className="min-h-screen bg-base-200 p-6 md:p-12 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            {t.searchTitle}
          </h1>
          <p className="text-xl opacity-70">
            {t.searchSubtitle}
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-12">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-base-content/50" />
          </div>
          <input
            type="text"
            className="input input-lg w-full pl-12 shadow-xl border-none ring-1 ring-base-300 focus:ring-primary transition-all"
            placeholder="e.g. 'Informatyka', 'Algorytmy', 'Analiza'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* RESULTS AREA */}
        {isLoading && (
          <div className="text-center py-12">
            <span className="loading loading-dots loading-lg text-primary"></span>
          </div>
        )}

        {!isLoading && results && (
          <div className="space-y-8">

            {/* SUBJECTS RESULTS */}
            {results.subjects.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="text-primary"/> {t.subjects} ({results.subjects.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.subjects.map((sub) => (
                    <div key={sub.id} className="card bg-base-100 shadow-md hover:shadow-xl transition-all border border-base-200">
                      <div className="card-body p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{sub.name}</h3>
                            <div className="badge badge-sm badge-ghost mt-1">{t.semester} {sub.semester}</div>
                          </div>
                          <Link to={`/university/${sub.university_id}`} className="btn btn-circle btn-sm btn-ghost">
                            <ArrowRight size={16}/>
                          </Link>
                        </div>
                        <div className="divider my-2"></div>
                        <div className="text-sm opacity-70 space-y-1">
                          <p className="flex items-center gap-2"><GraduationCap size={14}/> {sub.field}</p>
                          <p className="flex items-center gap-2"><Building2 size={14}/> {sub.university}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FIELDS RESULTS */}
            {results.fields.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Library className="text-secondary"/> {t.fields} ({results.fields.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.fields.map((field) => (
                    <div key={field.id} className="card bg-base-100 shadow-md hover:shadow-xl transition-all border border-base-200">
                      <div className="card-body p-5">
                        <h3 className="font-bold text-lg">{field.name}</h3>
                        <p className="text-sm opacity-50 mb-2">{field.degree}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 size={14} className="text-primary"/>
                          <span>{field.university} ({field.faculty})</span>
                        </div>
                        <div className="card-actions justify-end mt-4">
                          <Link to={`/university/${field.university_id}`} className="btn btn-sm btn-outline">
                            {t.viewUniversity}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {results.subjects.length === 0 && results.fields.length === 0 && debouncedQuery.length > 1 && (
              <div className="text-center py-12 opacity-50">
                <Search size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-xl">{t.noResults}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}