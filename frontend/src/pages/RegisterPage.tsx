import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Mail, Lock, GraduationCap } from 'lucide-react';
import { register, getUniversities } from '../utils/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { data: unis } = useQuery({ queryKey: ['unis'], queryFn: getUniversities });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      await register({
        email: form.email.value,
        password: form.password.value,
        university_id: Number(form.university.value)
      });
      navigate('/login');
    } catch (err) { setError('Registration failed'); }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="card w-96 bg-base-100 shadow-2xl p-8 border border-base-200">
        <h2 className="text-3xl font-bold text-center mb-6">Register</h2>
        {error && <div className="alert alert-error text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text flex gap-2"><Mail size={16}/> Email</span></label>
            <input name="email" type="email" className="input input-bordered" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text flex gap-2"><Lock size={16}/> Password</span></label>
            <input name="password" type="password" className="input input-bordered" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text flex gap-2"><GraduationCap size={16}/> University</span></label>
            <select name="university" className="select select-bordered" required>
                <option value="">Select University</option>
                {unis?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary w-full mt-4">Create Account</button>
        </form>
        <p className="text-center mt-4 text-sm">Have account? <Link to="/login" className="link link-primary">Login</Link></p>
      </div>
    </div>
  );
}