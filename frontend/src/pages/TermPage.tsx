import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, BookOpen, GraduationCap, ArrowRight, Library, Building2 } from 'lucide-react';
import { globalSearch } from '../utils/api';

// Hook debouncingu (opóźnienie wyszukiwania)
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Hook for immediate search with loading state
function useImmediateSearch<T>(value: T, delay: number): { debouncedValue: T; isSearching: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isSearching, setIsSearching] = useState(false);
  
  useEffect(() => {
    if (value && String(value).length > 1) {
      setIsSearching(true);
      const handler = setTimeout(() => {
        setDebouncedValue(value);
        setIsSearching(false);
      }, delay);
      return () => clearTimeout(handler);
    } else {
      setDebouncedValue(value);
      setIsSearching(false);
    }
  }, [value, delay]);
  
  return { debouncedValue, isSearching };
}

interface TermPageProps {
  t: any;
}

export function TermPage({ t }: TermPageProps) {
  const [query, setQuery] = useState("");
  const { debouncedValue, isSearching } = useImmediateSearch(query, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedValue],
    queryFn: () => globalSearch(debouncedValue),
    enabled: debouncedValue.length > 1
  });

  return (
    // FIX: Dodano 'pt-32 md:pt-40', aby Navbar nie zasłaniał treści
    // Usunięto bg-base-200, aby działało tło z index.css
    <div className="min-h-screen p-6 md:p-12 pt-32 md:pt-40 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            {t.searchTitle}
          </h1>
          <p className="text-xl opacity-70 text-white/80">
            {t.searchSubtitle}
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-12 z-10">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="text-white/50" />
          </div>
          {/* Użycie klasy glass-input dla spójności */}
          <input
            type="text"
            className="glass-input text-lg py-4 pl-14 w-full shadow-2xl focus:scale-[1.01] transition-transform"
            placeholder="e.g. 'Informatyka', 'Algorytmy', 'Analiza'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* RESULTS AREA */}
        {isLoading && (
          <div className="text-center py-12">
            <span className="loading loading-dots loading-lg text-[#5e5ce6]"></span>
          </div>
        )}

        {!isLoading && results && (
          <div className="space-y-8 pb-20">

            {/* SUBJECTS RESULTS */}
            {results.subjects.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                  <BookOpen className="text-[#5e5ce6]"/> {t.subjects} ({results.subjects.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.subjects.map((sub: any) => (
                    <div key={sub.id} className="card-spatial p-6 hover:border-[#5e5ce6]/40 group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-white group-hover:text-[#5e5ce6] transition-colors">{sub.name}</h3>
                          <div className="badge badge-sm bg-white/10 text-white border-none mt-2">{t.semester} {sub.semester}</div>
                        </div>
                        <Link to={`/university/${sub.university_id}`} className="btn btn-circle btn-sm btn-ghost text-white/50 hover:text-white hover:bg-white/10">
                          <ArrowRight size={16}/>
                        </Link>
                      </div>
                      <div className="h-px bg-white/10 my-4"></div>
                      <div className="text-sm text-white/60 space-y-1">
                        <p className="flex items-center gap-2"><GraduationCap size={14} className="text-[#32ade6]"/> {sub.field}</p>
                        <p className="flex items-center gap-2"><Building2 size={14} className="text-[#bf5af2]"/> {sub.university}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FIELDS RESULTS */}
            {results.fields.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Library className="text-[#32ade6]"/> {t.fields} ({results.fields.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.fields.map((field: any) => (
                    <div key={field.id} className="card-spatial p-6 hover:border-[#32ade6]/40 group">
                      <h3 className="font-bold text-lg text-white group-hover:text-[#32ade6] transition-colors">{field.name}</h3>
                      <p className="text-sm text-white/50 mb-3">{field.degree}</p>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Building2 size={14} className="text-[#5e5ce6]"/>
                        <span>{field.university} ({field.faculty})</span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link to={`/university/${field.university_id}`} className="text-sm font-bold text-[#32ade6] hover:text-white transition-colors flex items-center gap-1">
                          {t.viewUniversity} <ArrowRight size={14}/>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {results.subjects.length === 0 && results.fields.length === 0 && debouncedValue.length > 1 && (
              <div className="text-center py-16 opacity-50 border border-dashed border-white/10 rounded-2xl bg-white/5">
                <Search size={48} className="mx-auto mb-4 opacity-30"/>
                <p className="text-xl">{t.noResults}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}