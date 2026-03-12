/**
 * App.tsx - Root Application Component
 * Handles routing with React.lazy + Suspense for code-splitting,
 * theme management, language state, and persistent Navbar.
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { FeedbackWidget } from './components/FeedbackWidget';
import { t as translate, getCurrentLanguage, setLanguage, type Language } from './utils/i18n';
import { isAdmin } from './utils/api';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded route components for code-splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const TermPage = lazy(() => import('./pages/TermPage').then(m => ({ default: m.TermPage })));
const UniversityPage = lazy(() => import('./pages/UniversityPage').then(m => ({ default: m.UniversityPage })));
const RegionPage = lazy(() => import('./pages/RegionPage').then(m => ({ default: m.RegionPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const NotePage = lazy(() => import('./pages/NotePage'));

function App() {
  // Language state - synced with localStorage
  const [lang, setLang] = useState<Language>(() => getCurrentLanguage());

  // Theme state - dark mode by default
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Authentication token
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Translation function that uses current lang state
  const tFunc = (key: string): string => translate(key, lang);

  // Sync language to localStorage
  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Build a translations-like object for legacy component compatibility
  const tObj: Record<string, string> = new Proxy(
    {},
    {
      get: (_target, prop: string) => translate(prop, lang),
    }
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen font-sans transition-colors duration-500">
        {/* Persistent Navbar - always rendered outside Suspense */}
        <Navbar
          token={token}
          theme={theme}
          toggleTheme={toggleTheme}
          logout={handleLogout}
          t={tFunc}
          lang={lang}
          setLang={setLang}
        />

        {token && <FeedbackWidget token={token} />}

        {/* Suspense boundary with glass LoadingSpinner */}
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage t={tFunc} />} />
            <Route path="/login" element={<LoginPage setToken={setToken} t={tObj} />} />
            <Route path="/register" element={<RegisterPage t={tObj} />} />
            <Route path="/term" element={<TermPage t={tObj} />} />
            <Route path="/university/:id" element={<UniversityPage t={tObj} />} />
            <Route path="/universities/:id" element={<UniversityPage t={tObj} />} />
            <Route path="/note/:id" element={<NotePage />} />
            <Route path="/region/:regionName" element={<RegionPage t={tObj} />} />
            <Route
              path="/profile"
              element={token ? <ProfilePage t={tObj} /> : <Navigate to="/login" />}
            />
            <Route
              path="/admin"
              element={
                !token ? <Navigate to="/login" replace /> :
                !isAdmin() ? <Navigate to="/" replace /> :
                <AdminPage t={tObj} />
              }
            />
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="glass-panel p-12 text-center max-w-md">
                    <h1 className="text-6xl font-black text-gradient mb-4">404</h1>
                    <p className="text-lg opacity-60">Page not found</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
