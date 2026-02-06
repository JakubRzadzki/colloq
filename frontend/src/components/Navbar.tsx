import { Link } from 'react-router-dom';
import { LogOut, Sun, Moon, User as UserIcon, Search } from 'lucide-react';

interface NavbarProps {
  token: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  t: any;
  lang: 'pl' | 'en';
  setLang: (lang: 'pl' | 'en') => void;
}

export function Navbar({ token, theme, toggleTheme, logout, t, lang, setLang }: NavbarProps) {
  // Style zależne od motywu (Glassmorphism Light/Dark)
  const glassClass = theme === 'light'
    ? 'bg-white/70 border-black/5 text-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
    : 'bg-[#1e1e23]/60 border-white/10 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)]';

  const itemHoverClass = theme === 'light'
    ? 'hover:bg-black/5'
    : 'hover:bg-white/10';

  return (
    <div className="fixed top-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
      <div className={`${glassClass} backdrop-blur-xl border rounded-full px-6 py-3 flex items-center gap-4 md:gap-6 pointer-events-auto transition-all duration-300`}>

        {/* Logo */}
        <Link to="/" className="text-xl font-black tracking-tight hover:opacity-80 transition-opacity">
          Colloq
        </Link>

        {/* Nawigacja */}
        <div className={`hidden md:flex items-center gap-1 rounded-full p-1 border ${theme === 'light' ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'}`}>
          <Link to="/term" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex gap-2 items-center ${itemHoverClass}`}>
            <Search size={14} /> {t.findTerm || 'Szukaj'}
          </Link>

          <div className={`w-px h-4 mx-1 ${theme === 'light' ? 'bg-black/10' : 'bg-white/10'}`}></div>

          {/* Przełącznik Języka */}
          <button
            onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
            className={`px-3 py-1.5 text-xs font-bold transition-colors uppercase rounded-full ${itemHoverClass}`}
          >
            {lang}
          </button>
        </div>

        {/* Prawa strona: Motyw i User */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`btn btn-circle btn-sm btn-ghost ${itemHoverClass}`}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {token ? (
             <div className="dropdown dropdown-end">
               <label tabIndex={0} className={`btn btn-circle btn-sm btn-ghost avatar border ${theme === 'light' ? 'border-black/10' : 'border-white/20'}`}>
                 <div className="w-8 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center text-white">
                    <UserIcon size={16}/>
                 </div>
               </label>
               <ul tabIndex={0} className={`mt-4 p-2 shadow-2xl menu menu-sm dropdown-content rounded-2xl w-52 border backdrop-blur-xl ${theme === 'light' ? 'bg-white/90 border-black/5 text-gray-900' : 'bg-[#1e1e23]/90 border-white/10 text-white'}`}>
                  <li><Link to="/profile" className={itemHoverClass}>{t.profile}</Link></li>
                  <li><button onClick={logout} className="text-red-500 hover:bg-red-500/10 flex gap-2"><LogOut size={14}/> {t.logout}</button></li>
               </ul>
             </div>
          ) : (
            <Link to="/login" className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg shadow-[#5e5ce6]/20 hover:scale-105 transition-all">
              {t.login}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}