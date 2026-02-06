import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../utils/api';

export function LoginPage({ setToken, t }: { setToken: (t: string) => void; t: any }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Próba logowania jako:', username);
      const data = await login(username, password);
      console.log('Odpowiedź serwera:', data);

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        navigate('/');
      } else {
        setError('Błąd: Serwer nie zwrócił tokena.');
      }
    } catch (err: any) {
      console.error('Błąd logowania:', err);

      // Sprawdzamy czy to błąd sieci (brak response)
      if (!err.response) {
        setError('Błąd połączenia z serwerem. Upewnij się, że backend działa (localhost:8000).');
      } else {
        // Błąd zwrócony przez backend
        const detail = err.response?.data?.detail;
        if (detail === "Invalid credentials") {
          setError("Nieprawidłowy email lub hasło.");
        } else {
          setError(typeof detail === 'string' ? detail : 'Wystąpił błąd logowania.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 pt-20 animate-in fade-in zoom-in duration-500">
      <div className="glass-panel w-full max-w-md p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">

        <h1 className="text-4xl font-black text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2]">
          {t.login}
        </h1>
        <p className="text-center opacity-60 mb-8 text-sm">Witaj ponownie w Colloq</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label pl-1"><span className="label-text font-bold opacity-70">Email / Login</span></label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input"
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="form-control">
            <label className="label pl-1"><span className="label-text font-bold opacity-70">Hasło</span></label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-squircle w-full mt-4"
          >
            {loading ? <span className="loading loading-spinner"></span> : t.login}
          </button>
        </form>

        <p className="text-center mt-8 text-sm opacity-70">
          Nie masz konta?{' '}
          <Link to="/register" className="text-[#32ade6] font-bold hover:underline">
            {t.register}
          </Link>
        </p>
      </div>
    </div>
  );
}