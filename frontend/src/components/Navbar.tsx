import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, Sun, Moon, User as UserIcon, Search } from 'lucide-react';
import { isAdmin } from '../utils/api';
import { Language } from '../translations';

interface NavbarProps {
  token: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  t: any;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function Navbar({ token, theme, toggleTheme, logout, t, lang, setLang }: NavbarProps) {
  const userIsAdmin = isAdmin();

  return (
    // FIX: Dodano w-full i sticky, usunięto backdrop-blur z klasy navbar bo gryzł się z body
    <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* LEWA STRONA: LOGO */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 hover:opacity-80 transition-opacity">
            Colloq
          </Link>
          <Link to="/term" className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
             <Search size={16}/> {t.findTerm}
          </Link>
        </div>

        {/* PRAWA STRONA: AKCJE */}
        <div className="flex items-center gap-3">
          {/* Język */}
          <div className="join border border-white/10 rounded-lg overflow-hidden">
            <button
              className={`join-item px-3 py-1 text-xs font-bold ${lang === 'pl' ? 'bg-violet-600 text-white' : 'bg-transparent text-slate-400 hover:bg-white/5'}`}
              onClick={() => setLang('pl')}
            >
              PL
            </button>
            <button
              className={`join-item px-3 py-1 text-xs font-bold ${lang === 'en' ? 'bg-violet-600 text-white' : 'bg-transparent text-slate-400 hover:bg-white/5'}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>

          {/* User / Login */}
          {token ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder ring-1 ring-white/20">
                <div className="bg-violet-900/50 text-white rounded-full w-9"><UserIcon size={18}/></div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content bg-slate-900 border border-white/10 rounded-xl w-52 text-slate-200">
                <li><Link to="/profile">{t.profile}</Link></li>
                {userIsAdmin && (
                  <li><Link to="/admin" className="text-yellow-400"><ShieldCheck size={16}/> {t.admin}</Link></li>
                )}
                <div className="divider my-1 border-white/10"></div>
                <li><button onClick={logout} className="text-red-400 hover:text-red-300"><LogOut size={16}/> {t.logout}</button></li>
              </ul>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">{t.login}</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-slate-200 transition-colors">{t.register}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}