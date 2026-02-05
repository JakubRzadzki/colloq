import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { login } from '../utils/api';

export function LoginPage({ setToken, t }: { setToken: (t: string) => void; t: any }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    try {
      const data = await login(form.username.value, form.password.value);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <div className="card w-full max-w-md glass shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
            {t.login}
          </h2>
          <p className="text-slate-400 mt-2">Welcome back!</p>
        </div>

        {error && (
          <div className="alert alert-error bg-red-500/20 border-red-500/50 text-red-200 text-sm mb-6 rounded-xl flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label"><span className="label-text text-slate-300 font-medium flex gap-2"><Mail size={16}/> Email</span></label>
            <input
              name="username"
              type="email"
              placeholder="student@example.com"
              className="input glass-input w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text text-slate-300 font-medium flex gap-2"><Lock size={16}/> Password</span></label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              className="input glass-input w-full"
              required
            />
          </div>

          <button className="btn btn-primary w-full shadow-lg shadow-violet-500/30 border-none bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white" disabled={loading}>
            {loading ? <span className="loading loading-spinner"></span> : <>{t.login} <ArrowRight size={18}/></>}
          </button>
        </form>

        <div className="divider divider-neutral text-slate-500 mt-8 text-sm">OR</div>

        <p className="text-center text-sm text-slate-400">
          No account? <Link to="/register" className="text-violet-400 hover:text-violet-300 font-bold hover:underline transition-all">{t.register}</Link>
        </p>
      </div>
    </div>
  );
}