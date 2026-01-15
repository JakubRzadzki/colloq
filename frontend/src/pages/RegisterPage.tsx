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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    university_id: ''
  });

  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.email || !formData.password || !formData.university_id) {
      setError(lang === 'pl'
        ? 'Proszę wypełnić wszystkie wymagane pola'
        : 'Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError(lang === 'pl'
        ? 'Hasło musi mieć co najmniej 6 znaków'
        : 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/register`, {
        user: {
          email: formData.email,
          password: formData.password,
          university_id: parseInt(formData.university_id)
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);

      let errorMessage = t.errorReg || 'Registration failed';

      if (err.response?.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="card bg-base-100 shadow-xl border border-success w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
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
        <div className="card bg-base-100 shadow-2xl border border-base-300 animate-in slide-in-from-bottom-4 duration-300">
          <div className="card-body p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-2">
                <UserPlus size={32} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold">{t.register}</h2>
              <p className="text-sm opacity-70">
                {lang === 'pl'
                  ? 'Stwórz konto i dołącz do społeczności studentów'
                  : 'Create an account and join the student community'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="alert alert-error animate-in slide-in-from-top-4 duration-300">
                <AlertCircle size={20} />
                <span>{error}</span>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setError('')}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <Mail size={16} />
                      {t.emailPlaceholder}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="student@edu.pl"
                    className="input input-bordered w-full"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label className="label">
                    <span className="label-text-alt opacity-70">
                      {lang === 'pl' ? 'Użyj prawdziwego adresu email' : 'Use a valid email address'}
                    </span>
                  </label>
                </div>

                {/* Password */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <Lock size={16} />
                      {t.passPlaceholder}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered w-full"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label className="label">
                    <span className="label-text-alt opacity-70">
                      {lang === 'pl' ? 'Minimum 6 znaków' : 'Minimum 6 characters'}
                    </span>
                  </label>
                </div>

                {/* Region */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <MapPin size={16} />
                      {lang === 'pl' ? 'Województwo' : 'Region'}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedRegion}
                    onChange={e => {
                      setSelectedRegion(e.target.value);
                      setSearchQuery('');
                      setFormData(prev => ({ ...prev, university_id: '' }));
                    }}
                    required
                    disabled={loading}
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

                {/* University */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold flex items-center gap-2">
                      <GraduationCap size={16} />
                      {lang === 'pl' ? 'Uczelnia' : 'University'}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    name="university_id"
                    className="select select-bordered w-full"
                    value={formData.university_id}
                    onChange={handleInputChange}
                    disabled={!selectedRegion || loading}
                    required
                  >
                    <option value="" disabled>
                      {lang === 'pl' ? '-- Wybierz uczelnię --' : '-- Select university --'}
                    </option>
                    {filteredUnis.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {lang === 'pl' ? u.name_pl || u.name : u.name_en || u.name} ({u.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Filter */}
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
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className={`btn btn-primary w-full text-white text-lg ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {!loading && <UserPlus size={20} />}
                  {loading
                    ? (lang === 'pl' ? 'Rejestracja...' : 'Signing up...')
                    : t.registerBtn || 'Zarejestruj się'}
                </button>
              </div>

              {/* Privacy Policy Note */}
              <div className="text-center text-xs opacity-70">
                {lang === 'pl'
                  ? 'Rejestrując się, zgadzasz się na nasze Warunki Użytkowania i Politykę Prywatności'
                  : 'By registering, you agree to our Terms of Service and Privacy Policy'}
              </div>
            </form>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-base-300">
              <p className="text-sm opacity-70">
                {lang === 'pl' ? 'Masz już konto?' : 'Already have an account?'}{' '}
                <Link
                  to="/login"
                  className="link link-primary font-semibold"
                  onClick={(e) => loading && e.preventDefault()}
                >
                  {t.login || 'Zaloguj się'}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}