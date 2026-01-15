import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Mail, Lock, GraduationCap, MapPin, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { API_URL } from '../utils/api';

export function RegisterPage({ t, lang }: { t: any; lang: string }) {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  const regions = useMemo(() => {
    if (!unis) return [];
    return [...new Set(unis.map((u: any) => u.region))].filter(Boolean).sort();
  }, [unis]);

  const filteredUnis = useMemo(() => {
    if (!unis) return [];
    let list = selectedRegion ? unis.filter((u: any) => u.region === selectedRegion) : [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u: any) =>
        (u.name_pl && u.name_pl.toLowerCase().includes(q)) ||
        (u.name_en && u.name_en.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedRegion, searchQuery, unis]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      await axios.post(`${API_URL}/register`, {
        user: {
          email: (form.elements.namedItem('email') as HTMLInputElement).value,
          password: (form.elements.namedItem('password') as HTMLInputElement).value,
          university_id: parseInt((form.elements.namedItem('university_id') as HTMLSelectElement).value)
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || t.errorReg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="card bg-base-100 shadow-xl border border-success w-full max-w-md">
          <div className="card-body text-center space-y-4">
            <div className="inline-block mx-auto p-4 bg-success/10 rounded-full">
              <CheckCircle size={64} className="text-success" />
            </div>
            <h2 className="text-2xl font-bold">
              {lang === 'pl' ? 'Konto utworzone!' : 'Account created!'}
            </h2>
            <p className="opacity-70">
              {lang === 'pl'
                ? 'Za chwilę zostaniesz przekierowany do logowania...'
                : 'You will be redirected to login shortly...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <div className="w-full max-w-2xl">
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-2">
                <UserPlus size={32} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold">{t.register}</h2>
              <p className="text-sm opacity-70">
                {lang === 'pl'
                  ? 'Stwórz konto i dołącz do społeczności'
                  : 'Create an account and join the community'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <Mail size={16} />
                      {t.emailPlaceholder}
                    </span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="student@edu.pl"
                    className="input input-bordered w-full"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-control md:col-span-2">
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
                    minLength={6}
                  />
                  <label className="label">
                    <span className="label-text-alt opacity-70">
                      {lang === 'pl' ? 'Minimum 6 znaków' : 'Minimum 6 characters'}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <MapPin size={16} />
                      {lang === 'pl' ? 'Województwo' : 'Region'}
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedRegion}
                    onChange={e => {
                      setSelectedRegion(e.target.value);
                      setSearchQuery('');
                    }}
                    required
                  >
                    <option value="" disabled>
                      {lang === 'pl' ? '-- Wybierz województwo --' : '-- Select region --'}
                    </option>
                    {regions.map((r: any) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <GraduationCap size={16} />
                      {lang === 'pl' ? 'Uczelnia' : 'University'}
                    </span>
                  </label>
                  <select
                    name="university_id"
                    className="select select-bordered w-full"
                    disabled={!selectedRegion}
                    required
                  >
                    <option value="" disabled>
                      {lang === 'pl' ? '-- Wybierz uczelnię --' : '-- Select university --'}
                    </option>
                    {filteredUnis.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {lang === 'pl' ? u.name_pl : u.name_en} ({u.city})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRegion && filteredUnis.length > 5 && (
                  <div className="form-control md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={18} />
                      <input
                        type="text"
                        placeholder={lang === 'pl' ? 'Szukaj uczelni...' : 'Search university...'}
                        className="input input-bordered w-full pl-10"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`btn btn-primary w-full text-white ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {!loading && <UserPlus size={18} />}
                {loading
                  ? (lang === 'pl' ? 'Rejestracja...' : 'Signing up...')
                  : t.registerBtn}
              </button>
            </form>

            <div className="text-center pt-4 border-t border-base-300">
              <p className="text-sm opacity-70">
                {lang === 'pl' ? 'Masz już konto?' : 'Already have an account?'}{' '}
                <Link to="/login" className="link link-primary font-semibold">
                  {t.login}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}