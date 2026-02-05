// frontend/src/components/Navbar.tsx
// Floating glassmorphic navbar with premium design

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../utils/api';

interface NavbarProps {
  t: (key: string) => string;
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ t, user, onLogout }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
      <nav className="max-w-7xl mx-auto">
        {/* Floating pill-shaped glass container */}
        <div className="glass rounded-full px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text">
                Colloq
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className="px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/regions"
                className="px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                {t('nav.regions')}
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className="px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {t('nav.profile')}
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {t('nav.admin')}
                </Link>
              )}
            </div>

            {/* Mobile Menu Button - visible only on small screens */}
            <button
              type="button"
              className="md:hidden p-2 rounded-full hover:bg-white/10 transition-all"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg
                className="w-6 h-6 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Auth Section */}
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  {/* User Avatar */}
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-white/10 transition-all duration-200 group"
                  >
                    {user.avatar_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.avatar_url}`}
                        alt={user.username}
                        className="w-8 h-8 rounded-full border-2 border-violet-400 group-hover:border-indigo-400 transition-colors"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400 flex items-center justify-center border-2 border-transparent group-hover:border-white/20 transition-all">
                        <span className="text-white font-semibold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-slate-200 group-hover:text-white font-medium">
                      {user.username}
                    </span>
                  </Link>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 transition-all duration-200 font-medium"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-5 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-medium shadow-lg shadow-violet-500/50 hover:shadow-xl hover:shadow-violet-500/60 transition-all duration-200 transform hover:scale-105"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link to="/" className="px-4 py-2 rounded-full text-slate-200 hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.home')}
              </Link>
              <Link to="/regions" className="px-4 py-2 rounded-full text-slate-200 hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.regions')}
              </Link>
              {user && (
                <Link to="/profile" className="px-4 py-2 rounded-full text-slate-200 hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.profile')}
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-4 py-2 rounded-full text-slate-200 hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.admin')}
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
