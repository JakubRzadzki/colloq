import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Building2, PlusCircle, TrendingUp, Globe, Users, FileText, Activity } from 'lucide-react';
import { getUniversities, getNotes, getStats, API_URL } from '../utils/api';
import { AddUniversityModal } from '../components/AddUniversityModal';

/**
 * Home Page Component
 * Main landing page with search, statistics, and navigation
 * @param t - Translation object
 */
export default function HomePage({ t }: { t: any }) {
  const [search, setSearch] = useState("");
  const [isAddUniOpen, setAddUniOpen] = useState(false);
  const [showUniversities, setShowUniversities] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const token = localStorage.getItem('token');
  
  const uniSectionRef = useRef<HTMLElement>(null);
  const regionSectionRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  const { data: universities } = useQuery({
    queryKey: ['universities'],
    queryFn: getUniversities
  });
  
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats
  });
  
  const { data: recentNotes } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => getNotes()
  });
  
  const regions = Array.from(new Set(universities?.map(u => u.region))).sort();

  const filtered = universities?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.city.toLowerCase().includes(search.toLowerCase())
  );

  /**
   * Scroll to specific section
   * @param ref - Reference to section element
   */
  const scrollTo = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* HERO */}
      <section className="text-center pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#5e5ce6]/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#32ade6]/20 rounded-full blur-[100px] pointer-events-none"></div>

        <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent relative z-10">
          Colloq PRO
        </h1>
        <p className="text-xl opacity-70 mb-12 max-w-2xl mx-auto relative z-10 text-white">
          {t.heroSubtitle}
        </p>

        {/* Search - IMPROVED: Better styling and UX */}
        <div className="max-w-2xl mx-auto relative z-20">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-300 flex items-center justify-center">
              <Search size={16} className="text-white"/>
            </div>
            <input 
              type="text" 
              placeholder={t.searchPlaceholder || "Search for subjects, notes, universities..."} 
              className="glass-input pl-16 pr-16 py-4 text-lg shadow-2xl text-center text-white/90 placeholder-white/50 border border-white/20 focus:border-white/40 transition-all duration-300 group-focus-within:scale-105"
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  navigate(`/term?q=${encodeURIComponent(search)}`);
                }
              }}
            />
            <button 
              onClick={() => search.trim() && navigate(`/term?q=${encodeURIComponent(search)}`)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] hover:from-[#4a4ad1] hover:to-[#2a96d6] rounded-full p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
            >
              <Search size={20} className="text-white"/>
            </button>
            
            {/* Decorative elements */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#5e5ce6]/20 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#32ade6]/20 rounded-full animate-pulse delay-1000"></div>
          </div>
          
          {/* Quick search suggestions - REMOVED as requested */}
        </div>

        {/* STATS GRID - CLICKABLE FIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16 px-4 relative z-10">
            {/* Card 1: Universities */}
            <div onClick={() => scrollTo(uniSectionRef)} className="glass-panel p-6 cursor-pointer hover:bg-white/5 transition-all group text-left relative overflow-hidden">
                <Building2 className="text-[#5e5ce6] mb-2" size={32}/>
                <h3 className="text-4xl font-bold text-white">{universities?.length || 0}</h3>
                <p className="opacity-60 text-sm uppercase tracking-widest text-white">Universities</p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-white"><ArrowRight size={20}/></div>
            </div>
            
            {/* Card 2: Regions */}
            <div onClick={() => scrollTo(regionSectionRef)} className="glass-panel p-6 cursor-pointer hover:bg-white/5 transition-all group text-left relative overflow-hidden">
                <Globe className="text-[#32ade6] mb-2" size={32}/>
                <h3 className="text-4xl font-bold text-white">{regions.length}</h3>
                <p className="opacity-60 text-sm uppercase tracking-widest text-white">Regions</p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-white"><ArrowRight size={20}/></div>
            </div>
             
             {/* Card 3: Live - IMPROVED: Social Proof Ticker */}
             <div className="glass-panel p-8 cursor-default text-left relative overflow-hidden">
                <TrendingUp className="text-[#bf5af2] mb-2" size={32}/>
                <h3 className="text-4xl font-bold text-white">Live</h3>
                <p className="opacity-60 text-sm uppercase tracking-widest text-white">Data Feed</p>
                
                {/* Social Proof Ticker */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/10 rounded-full px-6 py-3 text-xs text-white/80 overflow-hidden">
                  <div className="animate-in fade-in">
                    {stats?.latest_activity.latest_note ? (
                      <span>
                        <span className="text-[#32ade6] font-bold">New note:</span> "{stats.latest_activity.latest_note.title}" added in University
                      </span>
                    ) : stats?.latest_activity.latest_user ? (
                      <span>
                        <span className="text-[#5e5ce6] font-bold">New user:</span> {stats.latest_activity.latest_user.nickname} joined
                      </span>
                    ) : stats?.latest_activity.latest_review ? (
                      <span>
                        <span className="text-[#bf5af2] font-bold">New review:</span> Added to University
                      </span>
                    ) : (
                      <span className="text-white/60">No recent activity</span>
                    )}
                  </div>
                </div>
            </div>
        </div>

        {/* RECENT NOTES SECTION - MVP: Trending/Recent Notes */}
        <section className="max-w-7xl mx-auto px-6 pb-20 pt-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold flex gap-3 items-center text-white">
                <Search className="text-[#5e5ce6]"/> Recently Added Materials
            </h2>
            <Link 
              to="/term" 
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-2"
            >
              View All <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentNotes?.slice(0, 3).map((note) => (
              <Link 
                to={`/university/${note.university_id}?note=${note.id}`} 
                key={note.id} 
                className="glass-panel p-6 rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer no-underline"
              >
                <div className="aspect-video bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] rounded-xl mb-4 overflow-hidden">
                  {note.image_url ? (
                    <img 
                      src={`${API_URL}${note.image_url}`} 
                      alt={note.title || "Note image"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {note.title || "Note"}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{note.title || "Untitled Note"}</h3>
                <div className="flex justify-between items-center text-sm text-white/60">
                  <span>by {note.author?.nickname || "Anonymous"}</span>
                  <span>{note.created_at ? new Date(note.created_at).toLocaleDateString() : "Unknown date"}</span>
                </div>
              </Link>
            ))}
            
            {/* Fallback if no notes available */}
            {(!recentNotes || recentNotes.length === 0) && (
              <div className="col-span-full text-center py-8 text-white/60">
                No notes available yet. Be the first to upload!
              </div>
            )}
          </div>
        </section>

        {/* SEARCH RESULTS SECTION - NEW: Real-time search results */}
        {search.trim() && (
          <section className="max-w-7xl mx-auto px-6 pb-20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold flex gap-3 items-center text-white">
                  <Search className="text-[#5e5ce6]"/> Search Results for "{search}"
              </h2>
              <button 
                onClick={() => setSearch("")}
                className="btn btn-sm btn-ghost text-white/60 hover:text-white"
              >
                Clear Search
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Filter universities by search term */}
              {universities?.filter(uni => 
                uni.name.toLowerCase().includes(search.toLowerCase()) || 
                uni.city.toLowerCase().includes(search.toLowerCase()) ||
                uni.description?.toLowerCase().includes(search.toLowerCase())
              ).map(uni => (
                <Link 
                  to={`/university/${uni.id}`} 
                  key={uni.id} 
                  className="glass-panel p-6 rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer no-underline"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] rounded-xl mb-4 overflow-hidden">
                    {uni.image_url ? (
                      <img 
                        src={`${API_URL}${uni.image_url}`} 
                        alt={uni.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {uni.name}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{uni.name}</h3>
                  <div className="flex justify-between items-center text-sm text-white/60">
                    <span>{uni.city}</span>
                    <span>{uni.region}</span>
                  </div>
                </Link>
              ))}
              
              {/* Filter notes by search term */}
              {recentNotes?.filter(note => 
                note.title?.toLowerCase().includes(search.toLowerCase()) || 
                note.content?.toLowerCase().includes(search.toLowerCase())
              ).map(note => (
                <Link 
                  to={`/university/${note.university_id}?note=${note.id}`} 
                  key={note.id} 
                  className="glass-panel p-6 rounded-xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer no-underline"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#bf5af2] to-[#32ade6] rounded-xl mb-4 overflow-hidden">
                    {note.image_url ? (
                      <img 
                        src={`${API_URL}${note.image_url}`} 
                        alt={note.title || "Note image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {note.title || "Note"}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{note.title || "Untitled Note"}</h3>
                  <div className="flex justify-between items-center text-sm text-white/60">
                    <span>by {note.author?.nickname || "Anonymous"}</span>
                    <span>{note.created_at ? new Date(note.created_at).toLocaleDateString() : "Unknown date"}</span>
                  </div>
                </Link>
              ))}
              
              {/* No results message */}
              {universities?.filter(uni => 
                uni.name.toLowerCase().includes(search.toLowerCase()) || 
                uni.city.toLowerCase().includes(search.toLowerCase()) ||
                uni.description?.toLowerCase().includes(search.toLowerCase())
              ).length === 0 && 
              recentNotes?.filter(note => 
                note.title?.toLowerCase().includes(search.toLowerCase()) || 
                note.content?.toLowerCase().includes(search.toLowerCase())
              ).length === 0 && (
                <div className="col-span-full text-center py-12 text-white/60 bg-white/5 rounded-2xl border border-white/10">
                  <Search size={48} className="mx-auto mb-4 opacity-30"/>
                  <p className="text-xl">No results found for "{search}"</p>
                  <p className="text-sm opacity-70 mt-2">Try searching for universities, notes, or subjects</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* QUICK FILTERS - MVP: Quick Tags under search */}
        <div className="max-w-2xl mx-auto px-4 relative z-10">
          <div className="flex flex-wrap gap-2 justify-center">
            <button 
              onClick={() => {
                setSearch('Informatyka');
                // Auto-trigger search after setting the value
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 0);
              }}
              className="glass-panel px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              Informatyka
            </button>
            <button 
              onClick={() => {
                setSearch('Matematyka');
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 0);
              }}
              className="glass-panel px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              Matematyka
            </button>
            <button 
              onClick={() => {
                setSearch('Kraków');
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 0);
              }}
              className="glass-panel px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              Kraków
            </button>
            <button 
              onClick={() => {
                setSearch('Egzaminy');
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 0);
              }}
              className="glass-panel px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              Egzaminy
            </button>
            <button 
              onClick={() => {
                setSearch('1. Rok');
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 0);
              }}
              className="glass-panel px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              1. Rok
            </button>
          </div>
        </div>

        {/* TRUST INDICATORS - MVP: Small stats under hero */}
        <div className="max-w-4xl mx-auto px-4 relative z-10 mt-8 text-center">
          <div className="text-white/60 text-sm space-y-1">
            <div>
              Dołącz do {stats?.users_count || 0}+ studentów • {stats?.notes_count || 0}+ dostępnych notatek • {stats?.universities_count || 0} uczelni
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERSITIES LIST */}
      <section ref={uniSectionRef} className="max-w-7xl mx-auto px-6 pt-10">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold flex gap-3 items-center text-white">
                <Building2 className="text-[#5e5ce6]"/> Available Universities
            </h2>
            {token && (
              <button onClick={() => setAddUniOpen(true)} className="btn btn-outline gap-2 rounded-full text-white border-white/20 hover:border-white hover:bg-white/10">
                <PlusCircle size={18}/> Add University
              </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered?.map(uni => (
                <Link to={`/university/${uni.id}`} key={uni.id} className="card-spatial group p-0 overflow-hidden h-64 flex flex-col justify-end relative no-underline block">
                    <div className="absolute inset-0">
                        <img 
                          src={uni.image_url ? `${API_URL}${uni.image_url}` : "https://via.placeholder.com/400"} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    </div>
                    <div className="relative p-6 z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#32ade6] transition-colors">{uni.name}</h3>
                        <div className="flex justify-between items-center text-white/80 group-hover:text-white transition-opacity">
                            <span className="text-sm flex gap-1 items-center"><MapPin size={14}/> {uni.city}</span>
                            <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
                                <ArrowRight size={14}/>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </section>

      {/* REGIONS LIST */}
      <section ref={regionSectionRef} className="max-w-7xl mx-auto px-6 pb-20 pt-10">
        <h2 className="text-3xl font-bold mb-8 flex gap-3 items-center text-white">
            <Globe className="text-[#32ade6]"/> Browse by Region
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {regions.map(region => (
                <Link to={`/region/${region}`} key={region} className="glass-panel p-4 hover:bg-white/10 transition-all text-center group cursor-pointer block no-underline">
                    <MapPin className="mx-auto mb-3 text-white/30 group-hover:text-[#32ade6] transition-colors" size={24}/>
                    <h4 className="font-bold text-lg text-white group-hover:text-[#32ade6] transition-colors">{region}</h4>
                    <p className="text-xs opacity-50 mt-1 text-white">{universities?.filter(u => u.region === region).length} Universities</p>
                </Link>
            ))}
        </div>
      </section>

      <AddUniversityModal isOpen={isAddUniOpen} onClose={() => setAddUniOpen(false)}/>
    </div>
  );
}
