import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { register } from '../utils/api';
import { Captcha } from '../components/Captcha';
import type { TFunction } from '../utils/i18n';

export function RegisterPage({ t }: { t: TFunction }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaValid || honeypot) return; // Block if captcha invalid or honeypot filled (bot)
    const form = e.target as HTMLFormElement;
    setError('');
    setLoading(true);

    try {
      await register({
        email: form.email.value,
        password: form.password.value,
      });
      alert('Rejestracja udana! Możesz się teraz zalogować.');
      navigate('/login');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Rejestracja nieudana. Sprawdź dane.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 pt-20 animate-in fade-in zoom-in">
      <div className="glass-panel w-full max-w-md p-8">
        <h2 className="text-3xl font-black text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#5e5ce6] to-[#32ade6]">
          {t.register}
        </h2>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label pl-1"><span className="label-text opacity-70 flex gap-2"><Mail size={16}/> Email</span></label>
            <input name="email" type="email" className="glass-input" required placeholder="student@university.edu" />
          </div>

          <div className="form-control">
            <label className="label pl-1"><span className="label-text opacity-70 flex gap-2"><Lock size={16}/> Hasło</span></label>
            <input name="password" type="password" className="glass-input" required placeholder="••••••••" />
          </div>

          <Captcha onValidChange={setCaptchaValid} honeypotValue={honeypot} setHoneypotValue={setHoneypot} />

          <button className="btn-squircle w-full mt-6" disabled={loading || !captchaValid}>
            {loading ? <span className="loading loading-spinner"></span> : t.register}
          </button>
        </form>

        <p className="text-center mt-6 text-sm opacity-70">
          Masz już konto? <Link to="/login" className="text-[#32ade6] font-bold hover:underline">{t.login}</Link>
        </p>
      </div>
    </div>
  );
}