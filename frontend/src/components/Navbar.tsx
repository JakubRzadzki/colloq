/**
 * Navbar Component
 * Floating glassmorphism navigation bar with:
 * - Logo link
 * - Search shortcut
 * - Language toggle (PL/EN)
 * - Theme toggle (Light/Dark)
 * - User avatar with dropdown menu
 * - Graceful handling for missing avatars
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Sun, Moon, Search, Shield, User as UserIcon, Bell } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { resolveUrl, getCurrentUser, getNotifications, markNotificationRead, markAllNotificationsRead } from '../utils/api';
import type { User } from '../utils/types';

interface NavbarProps {
  token: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  t: (key: string) => string;
  lang: 'pl' | 'en';
  setLang: (lang: 'pl' | 'en') => void;
}

export function Navbar({ token, theme, toggleTheme, logout, t, lang, setLang }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(false),
    enabled: !!token,
  });
  const unreadCount = notifications.filter((n: { read_at?: string | null }) => !n.read_at).length;

  // Fetch current user data when token is available
  useEffect(() => {
    if (token) {
      getCurrentUser()
        .then(setUser)
        .catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [token]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check admin status from JWT
  const checkIsAdmin = (): boolean => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token) as { is_admin?: boolean };
      return decoded.is_admin === true;
    } catch {
      return false;
    }
  };

  // Dynamic glass styling based on theme
  const isDark = theme === 'dark';

  const navGlass = isDark
    ? 'bg-[#0f172a]/70 border-white/[0.08] text-white shadow-[0_8px_40px_rgba(0,0,0,0.5)]'
    : 'bg-white/70 border-black/[0.05] text-slate-900 shadow-[0_8px_40px_rgba(0,0,0,0.08)]';

  const itemHover = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5';

  const pillBg = isDark
    ? 'bg-white/[0.04] border-white/[0.06]'
    : 'bg-black/[0.03] border-black/[0.05]';

  const dividerBg = isDark ? 'bg-white/10' : 'bg-black/10';

  // Avatar placeholder - gradient with first initial
  const renderAvatar = (size: string = 'w-10 h-10', textSize: string = 'text-lg') => {
    if (user?.avatar_url) {
      return (
        <img
          src={resolveUrl(user.avatar_url)}
          alt={user.nickname || 'User'}
          className={`${size} rounded-full object-cover`}
          onError={(e) => {
            // Graceful fallback if avatar image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white font-bold ${textSize}`}>
        {user?.nickname?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    );
  };

  return (
    <div className="fixed top-5 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
      <nav
        className={`${navGlass} backdrop-blur-2xl border rounded-full px-5 py-2.5 flex items-center gap-3 md:gap-5 pointer-events-auto transition-all duration-300`}
      >
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-black tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-gradient">Colloq</span>
        </Link>

        {/* Navigation Pills */}
        <div className={`hidden md:flex items-center gap-1 rounded-full p-1 border ${pillBg}`}>
          <Link
            to="/term"
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex gap-2 items-center ${itemHover}`}
          >
            <Search size={14} /> {t('findTerm')}
          </Link>

          <div className={`w-px h-4 mx-0.5 ${dividerBg}`} />

          {/* Language Toggle */}
          <button
            onClick={() => {
              const newLang = lang === 'en' ? 'pl' : 'en';
              setLang(newLang);
              localStorage.setItem('lang', newLang);
            }}
            className={`px-3 py-1.5 text-xs font-bold transition-colors uppercase rounded-full ${itemHover}`}
          >
            {lang === 'en' ? 'EN' : 'PL'}
          </button>
        </div>

        {/* Right Side: Notifications, Theme, User */}
        <div className="flex items-center gap-2">
          {/* Notifications Bell (logged in only) */}
          {token && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-full transition-colors relative ${itemHover}`}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className={`absolute right-0 mt-2 w-80 max-h-[360px] overflow-y-auto rounded-2xl border z-50 ${
                    isDark ? 'bg-[#1e293b]/95 border-white/10' : 'bg-white/95 border-black/5'
                  }`}
                  style={{ backdropFilter: 'blur(40px)' }}
                >
                  <div className={`px-4 py-2 border-b ${isDark ? 'border-white/10' : 'border-black/5'} flex justify-between items-center`}>
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await markAllNotificationsRead();
                          queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        }}
                        className="text-xs opacity-70 hover:opacity-100"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <p className={`px-4 py-6 text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>No notifications</p>
                    ) : (
                      notifications.slice(0, 20).map((n: { id: number; type: string; message: string; read_at?: string | null; created_at?: string }) => (
                        <div
                          key={n.id}
                          className={`px-4 py-2.5 text-sm border-b ${isDark ? 'border-white/5' : 'border-black/5'} ${!n.read_at ? (isDark ? 'bg-white/5' : 'bg-black/5') : ''}`}
                        >
                          {n.related_id && n.type === 'comment' ? (
                            <Link to={`/note/${n.related_id}`} onClick={() => setNotifOpen(false)} className="block">
                              <p className="font-medium">{n.message}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                              </p>
                            </Link>
                          ) : (
                            <div>
                              <p className="font-medium">{n.message}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${itemHover}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {token ? (
            /* Logged-in User Avatar & Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`rounded-full border-2 transition-all duration-300 overflow-hidden ${
                  isDark ? 'border-white/15 hover:border-white/30' : 'border-black/10 hover:border-black/20'
                }`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden">
                  {renderAvatar('w-9 h-9', 'text-base')}
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className={`absolute right-0 mt-3 w-56 rounded-2xl border overflow-hidden z-50 transition-all scale-in ${
                    isDark
                      ? 'bg-[#1e293b]/95 border-white/10 text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
                      : 'bg-white/95 border-black/5 text-slate-900 shadow-[0_16px_48px_rgba(0,0,0,0.12)]'
                  }`}
                  style={{ backdropFilter: 'blur(40px)' }}
                >
                  {/* User Info Header */}
                  <div className={`px-4 py-3.5 border-b ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <p className="font-semibold text-sm truncate">{user?.nickname || 'User'}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {user?.reputation_points || 0} {t('reputation') || 'reputation'}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemHover}`}
                    >
                      <UserIcon size={15} /> {t('profile')}
                    </Link>

                    {checkIsAdmin() && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${itemHover}`}
                      >
                        <Shield size={15} className="text-[#bf5af2]" /> {t('admin')}
                      </Link>
                    )}

                    <div className={`mx-3 my-1 h-px ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 w-full text-left transition-colors"
                    >
                      <LogOut size={15} /> {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Login Button */
            <Link
              to="/login"
              className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg shadow-[#5e5ce6]/20 hover:scale-105 hover:shadow-xl hover:shadow-[#5e5ce6]/30 transition-all"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
