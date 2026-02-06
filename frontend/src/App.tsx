import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { translations, Language } from './translations';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import { TermPage } from './pages/TermPage';
import { UniversityPage } from './pages/UniversityPage';
import { RegionPage } from './pages/RegionPage';
import ProfilePage from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const [lang, setLang] = useState<Language>(() =>
    (localStorage.getItem('lang') as Language) || 'pl'
  );

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') || 'dark'
  );

  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );

  const tObj = translations[lang];

  const tFunc = (key: string) => {
    return (tObj as any)[key] || key;
  };

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    // Zarządzanie motywem dla CSS (index.css) i Tailwind
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      {/* Usunięto sztywne bg-base-200. Tło jest w body (index.css) */}
      <div className="min-h-screen font-sans transition-colors duration-500">
        <Navbar
          token={token}
          theme={theme}
          toggleTheme={toggleTheme}
          logout={handleLogout}
          t={tObj}
          lang={lang}
          setLang={setLang}
        />

        <Routes>
          <Route path="/" element={<HomePage t={tFunc} />} />
          <Route path="/login" element={<LoginPage setToken={setToken} t={tObj} />} />
          <Route path="/register" element={<RegisterPage t={tObj} />} />
          <Route path="/term" element={<TermPage t={tObj} />} />
          <Route path="/university/:id" element={<UniversityPage t={tObj} />} />
          <Route path="/universities/:id" element={<UniversityPage t={tObj} />} />
          <Route path="/region/:regionName" element={<RegionPage t={tObj} />} />
          <Route path="/profile" element={token ? <ProfilePage t={tObj} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={token ? <AdminPage t={tObj} /> : <Navigate to="/login" />} />
          <Route path="*" element={<div className="p-20 text-center opacity-50">404 - Page Not Found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;