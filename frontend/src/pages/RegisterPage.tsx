import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Lock, GraduationCap } from 'lucide-react';
import { register, getUniversities } from '../utils/api';

export function RegisterPage({ t }: { t: any }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pobieranie uczelni do selecta
  const { data: unis, isLoading: unisLoading, isError } = useQuery({ queryKey: ['unis'], queryFn: getUniversities });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setError('');
    setLoading(true);

    try {
      await register({
        email: form.email.value,
        password: form.password.value,
        university_id: Number(form.university.value)
      });
      alert('Rejestracja udana! Możesz się teraz zalogować.');
      navigate('/login');
    } catch (err: any) {
      // Wyświetlanie błędu z backendu (np. "Email taken")
      setError(err.response?.data?.detail || 'Rejestracja nieudana. Sprawdź dane.');
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
        {isError && <div className="alert alert-warning text-sm mb-4">Nie udało się załadować listy uczelni.</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label pl-1"><span className="label-text opacity-70 flex gap-2"><Mail size={16}/> Email</span></label>
            <input name="email" type="email" className="glass-input" required placeholder="student@university.edu" />
          </div>

          <div className="form-control">
            <label className="label pl-1"><span className="label-text opacity-70 flex gap-2"><Lock size={16}/> Hasło</span></label>
            <input name="password" type="password" className="glass-input" required placeholder="••••••••" />
          </div>

          <div className="form-control">
            <label className="label pl-1"><span className="label-text opacity-70 flex gap-2"><GraduationCap size={16}/> Uczelnia</span></label>
            <select name="university" className="select glass-input w-full" required disabled={unisLoading}>
                <option value="">{unisLoading ? "Ładowanie uczelni..." : "Wybierz uczelnię"}</option>
                {unis?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <button className="btn-squircle w-full mt-6" disabled={loading || unisLoading || isError}>
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