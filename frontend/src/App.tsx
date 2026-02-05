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
    localStorage.getItem('theme') || 'light'
  );

  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );

  // 1. Obiekt tłumaczeń dla starych stron (LoginPage, Navbar, itp.)
  const tObj = translations[lang];

  // 2. Funkcja tłumaczeń dla nowego HomePage
  // (Pobiera tekst z obiektu na podstawie klucza, np. 'home.subtitle')
  const tFunc = (key: string) => {
    return (tObj as any)[key] || key;
  };

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
      <div className="min-h-screen bg-base-200 font-sans text-base-content">
        <Navbar
          token={token}
          theme={theme}
          toggleTheme={toggleTheme}
          logout={handleLogout}
          t={tObj} // Navbar używa obiektu
          lang={lang}
          setLang={setLang}
        />

        <Routes>
          {/* WAŻNE: HomePage dostaje funkcję tFunc */}
          <Route path="/" element={<HomePage t={tFunc} />} />

          {/* Pozostałe strony dostają obiekt tObj */}
          <Route path="/login" element={<LoginPage setToken={setToken} t={tObj} />} />
          <Route path="/register" element={<RegisterPage t={tObj} />} />
          <Route path="/term" element={<TermPage t={tObj} />} />

          {/* Obsługa obu wariantów ścieżki do uczelni */}
          <Route path="/university/:id" element={<UniversityPage t={tObj} />} />
          <Route path="/universities/:id" element={<UniversityPage t={tObj} />} />

          <Route path="/region/:regionName" element={<RegionPage t={tObj} />} />

          <Route path="/profile" element={token ? <ProfilePage t={tObj} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={token ? <AdminPage t={tObj} /> : <Navigate to="/login" />} />

          <Route path="*" element={<div className="p-10 text-center">404 - Not Found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;