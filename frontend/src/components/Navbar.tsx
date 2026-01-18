import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, Sun, Moon, User as UserIcon } from 'lucide-react';
import { isAdmin } from '../utils/api';

interface NavbarProps {
  token: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
}

export function Navbar({ token, theme, toggleTheme, logout }: NavbarProps) {
  const userIsAdmin = isAdmin();

  return (
    <div className="navbar bg-base-100/80 backdrop-blur-lg shadow-sm px-4 sticky top-0 z-50 border-b border-base-200">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-2xl font-black text-primary">Colloq</Link>
      </div>
      <div className="flex-none gap-3">
        <button onClick={toggleTheme} className="btn btn-ghost btn-circle btn-sm text-base-content">
          {theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
        </button>
        {token ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder ring ring-primary ring-offset-base-100 ring-offset-2">
              <div className="bg-neutral text-neutral-content rounded-full w-10"><UserIcon size={20}/></div>
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><Link to="/profile">Profile</Link></li>
              {userIsAdmin && <li><Link to="/admin" className="text-warning"><ShieldCheck size={16}/> Admin</Link></li>}
              <div className="divider my-1"></div>
              <li><button onClick={logout} className="text-error"><LogOut size={16}/> Logout</button></li>
            </ul>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm text-white">Register</Link>
          </div>
        )}
      </div>
    </div>
  );
}