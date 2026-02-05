import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Lock, GraduationCap, UserPlus } from 'lucide-react';
import { register, getUniversities } from '../utils/api';

export function RegisterPage({ t }: { t: any }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: unis, isLoading: unisLoading } = useQuery({ queryKey: ['unis'], queryFn: getUniversities });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    try {
      await register({
        email: form.email.value,
        password: form.password.value,
        university_id: Number(form.university.value)
      });
      navigate('/login');
    } catch (err) {
      setError('Registration failed. Ensure email is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <div className="card w-full max-w-md glass shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-violet-400">
            {t.register}
          </h2>
          <p className="text-slate-400 mt-2">Join the community</p>
        </div>

        {error && <div className="alert alert-error bg-red-500/20 border-red-500/50 text-red-200 text-sm mb-6 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label"><span className="label-text text-slate-300 font-medium flex gap-2"><Mail size={16}/> Email</span></label>
            <input name="email" type="email" placeholder="your@email.com" className="input glass-input w-full" required />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text text-slate-300 font-medium flex gap-2"><Lock size={16}/> Password</span></label>
            <input name="password" type="password" placeholder="••••••••" className="input glass-input w-full" required />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text text-slate-300 font-medium flex gap-2"><GraduationCap size={16}/> University</span></label>
            <select name="university" className="select glass-input w-full text-white" required disabled={unisLoading}>
                <option value="" className="text-black">Select University</option>
                {unis?.map(u => <option key={u.id} value={u.id} className="text-black">{u.name}</option>)}
            </select>
          </div>

          <button className="btn btn-primary w-full mt-4 shadow-lg shadow-fuchsia-500/30 border-none bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white" disabled={loading || unisLoading}>
            {loading ? <span className="loading loading-spinner"></span> : <>{t.register} <UserPlus size={18}/></>}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-bold hover:underline transition-all">{t.login}</Link>
        </p>
      </div>
    </div>
  );
}