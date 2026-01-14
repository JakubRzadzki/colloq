import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/api';

export function LoginPage({ setToken, t }: { setToken: (token: string) => void, t: any }) {
  const navigate = useNavigate();

  // @ts-ignore
  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/token`, new FormData(e.target));
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
      navigate('/');
    } catch {
      alert(t.errorLogin);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh] p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-8">
          <h2 className="card-title justify-center text-3xl mb-6 font-bold text-primary">{t.login}</h2>
          <form onSubmit={handleLogin} className="form-control flex flex-col gap-4">
            <div>
              <label className="label"><span className="label-text font-semibold">{t.emailPlaceholder}</span></label>
              <input name="username" type="email" placeholder="student@edu.pl" className="input input-bordered w-full" required />
            </div>
            <div>
              <label className="label"><span className="label-text font-semibold">{t.passPlaceholder}</span></label>
              <input name="password" type="password" placeholder="••••••••" className="input input-bordered w-full" required />
            </div>
            <button className="btn btn-primary w-full text-white mt-4 text-lg">{t.loginBtn}</button>
          </form>
        </div>
      </div>
    </div>
  );
}