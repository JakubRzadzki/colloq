import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { API_URL } from '../utils/api';

export function LoginPage({ setToken, t }: { setToken: (token: string) => void; t: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const res = await axios.post(`${API_URL}/token`, formData);

      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || t.errorLogin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <div className="w-full max-w-md">
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-2">
                <LogIn size={32} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold">{t.login}</h2>
              <p className="text-sm opacity-70">
                {t.lang === 'pl'
                  ? 'Zaloguj się, aby uzyskać dostęp do platformy'
                  : 'Sign in to access the platform'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Mail size={16} />
                    {t.emailPlaceholder}
                  </span>
                </label>
                <input
                  name="username"
                  type="email"
                  placeholder="student@edu.pl"
                  className="input input-bordered w-full"
                  required
                  autoFocus
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Lock size={16} />
                    {t.passPlaceholder}
                  </span>
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary w-full text-white ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {!loading && <LogIn size={18} />}
                {loading ? t.lang === 'pl' ? 'Logowanie...' : 'Signing in...' : t.loginBtn}
              </button>
            </form>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-base-300">
              <p className="text-sm opacity-70">
                {t.lang === 'pl' ? 'Nie masz konta?' : "Don't have an account?"}{' '}
                <Link to="/register" className="link link-primary font-semibold">
                  {t.register}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}