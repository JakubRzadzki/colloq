import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Turnstile } from '@marsidev/react-turnstile';
import { Search } from 'lucide-react';
import { API_URL } from '../utils/api';

export function RegisterPage({ t, lang }: { t: any, lang: string }) {
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  const regions = useMemo(() => {
    if (!unis) return [];
    // @ts-ignore
      return [...new Set(unis.map((u: any) => u.region))].filter(Boolean).sort();
  }, [unis]);

  const filteredUnis = useMemo(() => {
    if (!unis) return [];
    let list = selectedRegion ? unis.filter((u: any) => u.region === selectedRegion) : [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u: any) =>
        (u.name_pl && u.name_pl.toLowerCase().includes(q)) ||
        (u.name_en && u.name_en.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedRegion, searchQuery, unis]);

  // @ts-ignore
    const handleRegister = async (e: any) => {
    e.preventDefault();

    if (!captchaToken) {
      alert("Proszę rozwiązać Captcha!");
      return;
    }

    try {
      await axios.post(`${API_URL}/register`, {
        user: {
          email: e.target.email.value,
          password: e.target.password.value,
          university_id: parseInt(e.target.university_id.value)
        },
        captcha_token: captchaToken
      });
      alert(t.successReg);
      navigate('/login');
    } catch (err: any) {
      alert(err.response?.data?.detail || t.errorReg);
      setCaptchaToken(null);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-8 text-base-content">
          <h2 className="card-title justify-center text-3xl mb-6 font-bold text-primary">{t.register}</h2>
          <form onSubmit={handleRegister} className="form-control flex flex-col gap-4">
            <input name="email" type="email" placeholder={t.emailPlaceholder} className="input input-bordered w-full" required />
            <input name="password" type="password" placeholder={t.passPlaceholder} className="input input-bordered w-full" required />

            <div>
              <label className="label"><span className="label-text font-semibold">Województwo</span></label>
              <select className="select select-bordered w-full" value={selectedRegion} onChange={e => {setSelectedRegion(e.target.value); setSearchQuery('');}} required>
                <option value="" disabled>-- Wybierz Województwo --</option>
                {regions.map((r: any) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
               <label className="label"><span className="label-text font-semibold">Uczelnia</span></label>
               <input
                  type="text"
                  placeholder="Szukaj uczelni..."
                  className="input input-bordered w-full mb-2"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={!selectedRegion}
               />
               <select name="university_id" className="select select-bordered w-full" disabled={!selectedRegion} required>
                <option value="" disabled>-- Wybierz z listy --</option>
                {filteredUnis.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {lang === 'pl' ? u.name_pl : u.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center my-4 p-2 bg-base-200 rounded-lg overflow-hidden">
              <Turnstile
                siteKey="1x00000000000000000000AB" // Klucz testowy Cloudflare (zawsze wymaga kliknięcia)
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div>

            <button className="btn btn-primary w-full text-white text-lg" disabled={!captchaToken}>
              {t.registerBtn}
            </button>
          </form>
          <div className="text-center mt-4">
            <Link to="/login" className="link link-hover text-sm opacity-70">Masz już konto? Zaloguj się</Link>
          </div>
        </div>
      </div>
    </div>
  );
}