import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, Sun, Moon, User as UserIcon, Search } from 'lucide-react';
import { isAdmin } from '../utils/api';
import { Language } from '../translations';

interface NavbarProps {
  token: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  // New props for i18n
  t: any;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function Navbar({ token, theme, toggleTheme, logout, t, lang, setLang }: NavbarProps) {
  const userIsAdmin = isAdmin();

  return (
    <div className="navbar bg-base-100/80 backdrop-blur-lg shadow-sm px-4 sticky top-0 z-50 border-b border-base-200">
      <div className="flex-1 flex gap-4 items-center">
        <Link to="/" className="btn btn-ghost normal-case text-2xl font-black text-primary">Colloq</Link>
        <Link to="/term" className="btn btn-ghost btn-sm hidden md:flex gap-2">
           <Search size={16}/> {t.findTerm}
        </Link>
      </div>

      <div className="flex-none gap-2 items-center">
        {/* Language Switcher */}
        <div className="join">
          <button
            className={`join-item btn btn-xs ${lang === 'pl' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLang('pl')}
          >
            PL
          </button>
          <button
            className={`join-item btn btn-xs ${lang === 'en' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>

        <button onClick={toggleTheme} className="btn btn-ghost btn-circle btn-sm text-base-content">
          {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
        </button>

        {token ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder ring ring-primary ring-offset-base-100 ring-offset-2">
              <div className="bg-neutral text-neutral-content rounded-full w-10"><UserIcon size={20}/></div>
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><Link to="/profile">{t.profile}</Link></li>
              {userIsAdmin && <li><Link to="/admin" className="text-warning"><ShieldCheck size={16}/> {t.admin}</Link></li>}
              <div className="divider my-1"></div>
              <li><button onClick={logout} className="text-error"><LogOut size={16}/> {t.logout}</button></li>
            </ul>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">{t.login}</Link>
            <Link to="/register" className="btn btn-primary btn-sm text-white">{t.register}</Link>
          </div>
        )}
      </div>
    </div>
  );
}