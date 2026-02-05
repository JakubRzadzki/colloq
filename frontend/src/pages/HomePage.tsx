// frontend/src/pages/HomePage.tsx
// Modern hero section with gradient text and glassmorphic search

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUniversities, University } from '../utils/api';

interface HomePageProps {
  t: (key: string) => string;
}

const HomePage: React.FC<HomePageProps> = ({ t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<University[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchUniversities(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, handleSearch]);

  const handleUniversityClick = (universityId: number) => {
    navigate(`/universities/${universityId}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Orbs Background */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-32">
          {/* Hero Content */}
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="glass inline-flex items-center px-4 py-2 rounded-full">
              <span className="text-violet-400 text-sm font-medium">
                🎓 Academic Excellence Platform
              </span>
            </div>

            {/* Heading – large bold typography with gradient text */}
            <h1 className="text-5xl sm:text-7xl font-bold leading-tight">
              <span className="block text-white/90 mb-2">Share Knowledge.</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 animate-gradient">
                Build Community.
              </span>
            </h1>

            {/* Subheading – sufficient contrast */}
            <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              {t('home.subtitle') || 'Discover universities, share study materials, and connect with students worldwide.'}
            </p>

            {/* Search Bar with Glow */}
            <div className="max-w-2xl mx-auto mt-12">
              <div
                className={`relative transition-all duration-300 ${
                  isFocused ? 'scale-105' : 'scale-100'
                }`}
              >
                {/* Glow Effect */}
                {isFocused && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                )}

                {/* Search Input – glass effect */}
                <div className="glass relative rounded-2xl p-2">
                  <div className="flex items-center space-x-3">
                    {/* Search Icon */}
                    <div className="pl-4">
                      <svg
                        className="w-6 h-6 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>

                    {/* Input */}
                    <input
                      type="text"
                      placeholder={t('home.search.placeholder') || 'Search universities...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      className="flex-1 bg-transparent text-white placeholder-slate-400 text-lg py-4 outline-none"
                    />

                    {/* Loading Spinner */}
                    {isSearching && (
                      <div className="pr-4">
                        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Search Results – University cards with .glass and hover */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 glass rounded-xl overflow-hidden">
                      {searchResults.map((university) => (
                        <button
                          key={university.id}
                          onClick={() => handleUniversityClick(university.id)}
                          className="w-full px-6 py-4 text-left border-b border-white/5 last:border-b-0 group transition-all duration-300 hover:scale-[1.02] hover:brightness-110"
                        >
                          <div className="flex items-center space-x-3">
                            {university.image_url ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${university.image_url}`}
                                alt={university.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {university.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-white/90 font-medium group-hover:text-violet-300 transition-colors">
                                {university.name}
                              </p>
                              <p className="text-white/70 text-sm">{university.region}</p>
                            </div>
                            <svg
                              className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links – vibrant accent with glow */}
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              <button
                onClick={() => navigate('/regions')}
                className="glass px-6 py-3 rounded-xl text-white/90 hover:text-white hover:brightness-110 transition-all duration-200 font-medium"
              >
                🌍 Browse by Region
              </button>
              <button
                onClick={() => navigate('/upload')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-medium shadow-lg shadow-violet-500/50 hover:shadow-violet-500/70 transition-all duration-200 transform hover:scale-105"
              >
                📚 Share Materials
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section – .glass cards, hover scale + brightness */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group glass rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-2xl hover:shadow-violet-500/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-3xl">🎓</span>
            </div>
            <h3 className="text-2xl font-bold text-white/90 mb-3">
              {t('home.features.universities.title') || 'Discover Universities'}
            </h3>
            <p className="text-white/70 leading-relaxed">
              {t('home.features.universities.description') || 'Browse universities from around the world and explore their programs, reviews, and study materials.'}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group glass rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-2xl hover:shadow-indigo-500/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="text-2xl font-bold text-white/90 mb-3">
              {t('home.features.materials.title') || 'Share Materials'}
            </h3>
            <p className="text-white/70 leading-relaxed">
              {t('home.features.materials.description') || 'Upload and access study materials, notes, and resources shared by students worldwide.'}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group glass rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-2xl hover:shadow-purple-500/20">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-2xl font-bold text-white/90 mb-3">
              {t('home.features.community.title') || 'Join Community'}
            </h3>
            <p className="text-white/70 leading-relaxed">
              {t('home.features.community.description') || 'Connect with students, share experiences, and build a global academic community.'}
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section – glass + accent button with glow */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass rounded-3xl p-12 relative overflow-hidden">
          <div className="relative">
            <h2 className="text-4xl font-bold text-white/90 mb-4">
              Ready to get started?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Join thousands of students sharing knowledge worldwide.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-lg font-semibold shadow-lg shadow-violet-500/50 hover:shadow-violet-500/70 transition-all duration-200 transform hover:scale-105"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
