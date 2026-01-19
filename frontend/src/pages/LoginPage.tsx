import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { login } from '../utils/api';

// FIX: Add t to props type
export function LoginPage({ setToken, t }: { setToken: (t: string) => void; t: any }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      const data = await login(form.username.value, form.password.value);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      navigate('/');
    } catch (err) { setError('Invalid credentials'); }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="card w-96 bg-base-100 shadow-2xl p-8 border border-base-200">
        <h2 className="text-3xl font-bold text-center mb-6">{t.login}</h2>
        {error && <div className="alert alert-error text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text flex gap-2"><Mail size={16}/> Email</span></label>
            <input name="username" type="email" className="input input-bordered" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text flex gap-2"><Lock size={16}/> Password</span></label>
            <input name="password" type="password" className="input input-bordered" required />
          </div>
          <button className="btn btn-primary w-full mt-4">{t.login}</button>
        </form>
        <p className="text-center mt-4 text-sm">No account? <Link to="/register" className="link link-primary">{t.register}</Link></p>
      </div>
    </div>
  );
}