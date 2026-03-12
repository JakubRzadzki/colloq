/**
 * Home Page Component
 * Main landing page featuring:
 * - Hero section with animated search bar
 * - Real-time platform statistics
 * - Live activity feed
 * - Top contributors leaderboard
 * - Recent notes grid
 * - University browser
 * - Region browser
 *
 * Performance: Uses single batched /home query instead of 5+ separate requests.
 */
import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ArrowRight,
  Building2,
  PlusCircle,
  TrendingUp,
  Globe,
  Trophy,
  Star,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { getHome, resolveUrl } from '../utils/api';
import { AddUniversityModal } from '../components/AddUniversityModal';
import { t } from '../utils/i18n';

interface HomePageProps {
  t: (key: string) => string;
}

export default function HomePage() {
  const t = (key: string) => key; // Placeholder translation function
  const [search, setSearch] = useState('');
  const [isAddUniOpen, setAddUniOpen] = useState(false);
  const token = localStorage.getItem('token');

  const uniSectionRef = useRef<HTMLElement>(null);
  const regionSectionRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  // Single batched query for home page data
  const { data: home, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: getHome,
    staleTime: 30000, // Cache for 30s to reduce refetches
  });

  const universities = home?.universities;
  const stats = home?.stats;
  const recentNotes = home?.recent_notes;
  const leaderboardData = home?.leaderboard;
  const activityFeed = home?.activity_feed;

  // Memoize derived data to avoid recalculation on re-renders
  const regions = useMemo(
    () => Array.from(new Set(universities?.map((u) => u.region).filter(Boolean))).sort(),
    [universities]
  );

  const filtered = useMemo(
    () =>
      universities?.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.city.toLowerCase().includes(search.toLowerCase())
      ),
    [universities, search]
  );

  const scrollTo = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/term?q=${encodeURIComponent(search)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-[var(--accent-color)] border-r-[var(--accent-secondary)] animate-spin" />
          <div className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 fade-in">
      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section className="text-center pt-36 pb-20 px-4 relative overflow-hidden">
        {/* Background Aurora Blobs */}
        <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-[#5e5ce6]/15 rounded-full blur-[60px] pointer-events-none animate-aurora" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#32ade6]/12 rounded-full blur-[60px] pointer-events-none animate-aurora" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#bf5af2]/8 rounded-full blur-[70px] pointer-events-none" />

        <h1 className="text-6xl md:text-8xl font-black mb-6 text-gradient relative z-10">
          Colloq
        </h1>
        <p className="text-xl opacity-70 mb-12 max-w-2xl mx-auto relative z-10">
          {t('heroSubtitle')}
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative z-20">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-300 flex items-center justify-center">
              <Search size={14} className="text-white" />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="glass-input pl-16 pr-16 py-5 text-lg shadow-aurora text-center"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              onClick={() => search.trim() && navigate(`/term?q=${encodeURIComponent(search)}`)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] hover:from-[#4a4ad1] hover:to-[#2a96d6] rounded-full p-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
            >
              <Search size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="max-w-2xl mx-auto px-4 relative z-10 mt-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {['Informatyka', 'Matematyka', 'Algorytmy', 'Egzaminy', '1. Rok'].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSearch(tag);
                  navigate(`/term?q=${encodeURIComponent(tag)}`);
                }}
                className="glass-panel px-4 py-2 rounded-full text-sm opacity-70 hover:opacity-100 transition-all hover:scale-105 cursor-pointer border-none"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="max-w-4xl mx-auto px-4 relative z-10 mt-8 text-center">
          <p className="text-sm opacity-40">
            {t('join_community')} {stats?.users_count || 0}
            {t('students_suffix')} &bull; {stats?.notes_count || 0}
            {t('notes_available')} &bull; {stats?.universities_count || 0}{' '}
            {t('universities').toLowerCase()}
          </p>
        </div>
      </section>

      {/* ================================================================
          STATS + LIVE FEED + LEADERBOARD ROW
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Card */}
          <button
            onClick={() => scrollTo(uniSectionRef as React.RefObject<HTMLElement>)}
            className="glass-panel p-7 cursor-pointer hover:scale-[1.02] transition-all group text-left relative overflow-hidden"
          >
            <Building2 className="text-[#5e5ce6] mb-3" size={32} />
            <h3 className="text-5xl font-black">{stats?.universities_count || universities?.length || 0}</h3>
            <p className="text-xs uppercase tracking-[0.15em] opacity-50 mt-1 font-semibold">{t('total_universities')}</p>
            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={20} className="text-[#5e5ce6]" />
            </div>
          </button>

          {/* Live Activity Feed */}
          <div className="glass-panel p-7 text-left overflow-hidden">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="text-[#bf5af2]" size={22} />
              <h3 className="font-bold text-base">{t('live_feed')}</h3>
              <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {activityFeed && activityFeed.length > 0 ? (
                activityFeed.map((item: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="activity-item !p-3 !rounded-xl">
                    <div className="activity-icon !w-8 !h-8">
                      {item.type === 'note' ? <FileText size={14} /> : <MessageSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.type === 'note'
                          ? item.title || 'New Note'
                          : `Review: ${item.comment?.slice(0, 40) || 'No comment'}...`}
                      </p>
                      <p className="text-xs opacity-40 truncate">
                        {t('by_author')} {item.user_nickname}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm opacity-40 text-center py-6">No recent activity</p>
              )}
            </div>
          </div>

          {/* Top Contributors Leaderboard */}
          <div className="glass-panel p-7 text-left overflow-hidden">
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="text-[#f59e0b]" size={22} />
              <h3 className="font-bold text-base">{t('top_contributors')}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                leaderboardData.leaderboard.slice(0, 5).map((user: Record<string, unknown>) => (
                  <div key={user.user_id} className="leaderboard-item !p-3 !rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`leaderboard-rank !w-7 !h-7 text-xs ${
                          user.rank === 1
                            ? 'rank-1'
                            : user.rank === 2
                            ? 'rank-2'
                            : user.rank === 3
                            ? 'rank-3'
                            : 'rank-other'
                        }`}
                      >
                        {user.rank}
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={resolveUrl(user.avatar_url)}
                            alt={user.nickname}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white text-xs font-bold">
                            {user.nickname?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{user.nickname}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={12} className="text-[#f59e0b]" />
                      <span className="text-xs font-semibold">{user.reputation_points}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm opacity-40 text-center py-6">No leaderboard data yet</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          RECENT NOTES
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold flex gap-3 items-center">
            <FileText className="text-[#5e5ce6]" /> {t('recently_added')}
          </h2>
          <Link
            to="/term"
            className="text-[#5e5ce6] hover:opacity-80 font-semibold flex items-center gap-2 transition-opacity"
          >
            {t('view_all')} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(recentNotes) && recentNotes.slice(0, 6).map((note) => (
            <Link
              to={`/note/${note.id}`}
              key={note.id}
              className="glass-panel p-0 overflow-hidden rounded-2xl hover:shadow-aurora transition-all duration-300 hover:-translate-y-1 cursor-pointer no-underline block group"
            >
              <div className="aspect-video bg-gradient-to-br from-[#5e5ce6]/20 to-[#32ade6]/20 overflow-hidden relative">
                {note.image_url ? (
                  <img
                    src={resolveUrl(note.image_url)}
                    alt={note.title || 'Note image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={40} className="opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold mb-2 truncate">{note.title || 'Untitled Note'}</h3>
                <div className="flex justify-between items-center text-sm opacity-50">
                  <span className="truncate">
                    {t('by_author')} {note.author?.nickname || 'Anonymous'}
                  </span>
                  <span className="flex-shrink-0">
                    {note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {(!recentNotes || recentNotes.length === 0) && (
            <div className="col-span-full empty-state">
              <FileText size={48} className="empty-state-icon" />
              <p className="text-xl font-semibold opacity-60 mb-2">{t('no_notes_yet')}</p>
              <p className="text-sm opacity-40">{t('be_first_to_upload')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          UNIVERSITIES LIST
          ================================================================ */}
      <section ref={uniSectionRef} className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold flex gap-3 items-center">
            <Building2 className="text-[#5e5ce6]" /> {t('available_universities')}
          </h2>
          {token && (
            <button
              onClick={() => setAddUniOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium opacity-70 hover:opacity-100 transition-all hover:scale-105"
            >
              <PlusCircle size={16} /> {t('add_university')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(filtered) && filtered.map((uni) => (
            <Link
              to={`/university/${uni.id}`}
              key={uni.id}
              className="card-spatial group p-0 overflow-hidden h-64 flex flex-col justify-end relative no-underline"
            >
              <div className="absolute inset-0">
                <img
                  src={resolveUrl(uni.image_url, 'https://placehold.co/400x200/5e5ce6/ffffff?text=University')}
                  alt={uni.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
              <div className="relative p-6 z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#32ade6] transition-colors">
                  {uni.name}
                </h3>
                <div className="flex justify-between items-center text-white/80 group-hover:text-white transition-opacity">
                  <span className="text-sm flex gap-1 items-center">
                    <MapPin size={14} /> {uni.city}
                  </span>
                  <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {(!filtered || filtered.length === 0) && (
            <div className="col-span-full empty-state">
              <Building2 size={48} className="empty-state-icon" />
              <p className="text-xl font-semibold opacity-60">No universities found</p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          REGIONS LIST
          ================================================================ */}
      {regions.length > 0 && (
        <section ref={regionSectionRef} className="max-w-7xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-bold mb-8 flex gap-3 items-center">
            <Globe className="text-[#32ade6]" /> {t('browse_by_region')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.isArray(regions) && regions.map((region) => (
              <Link
                to={`/region/${region}`}
                key={region}
                className="glass-panel p-5 hover:scale-105 transition-all text-center group cursor-pointer block no-underline"
              >
                <MapPin
                  className="mx-auto mb-3 opacity-30 group-hover:text-[#32ade6] group-hover:opacity-100 transition-all"
                  size={22}
                />
                <h4 className="font-bold text-base group-hover:text-[#32ade6] transition-colors">
                  {region}
                </h4>
                <p className="text-xs opacity-40 mt-1">
                  {Array.isArray(universities) && universities.filter((u) => u.region === region).length} {t('universities')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Add University Modal */}
      <AddUniversityModal isOpen={isAddUniOpen} onClose={() => setAddUniOpen(false)} />
    </div>
  );
}
