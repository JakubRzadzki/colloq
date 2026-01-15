import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, Sun, Moon, Globe, User as UserIcon } from 'lucide-react';
import { isAdmin } from '../utils/api';

export function Navbar({ token, t, lang, theme, toggleTheme, toggleLang, logout }: any) {
  const userIsAdmin = isAdmin();

  return (
    <div className="navbar bg-base-100 shadow-md px-4 sticky top-0 z-50">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-2xl text-primary font-bold">Colloq</Link>
      </div>
      <div className="flex-none gap-2">
            <button onClick={toggleTheme} className="btn btn-ghost btn-circle btn-sm text-base-content">
                {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
            </button>
        <button onClick={toggleLang} className="btn btn-ghost btn-sm font-bold">
          {lang.toUpperCase()}
        </button>
        {token ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-neutral-focus text-neutral-content rounded-full w-10"><UserIcon /></div>
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              {userIsAdmin && <li><Link to="/admin" className="text-warning"><ShieldCheck size={16}/> Admin</Link></li>}
              <li><button onClick={logout}><LogOut size={16}/> {t.logout}</button></li>
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