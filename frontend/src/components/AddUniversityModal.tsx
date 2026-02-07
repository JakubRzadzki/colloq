import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, Upload } from 'lucide-react';
import { createUniversity } from '../utils/api';
import { POLISH_REGIONS } from '../utils/constants';

interface Props { isOpen: boolean; onClose: () => void; }

export function AddUniversityModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => { if (isOpen) setError(''); }, [isOpen]);

  const mutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universities'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      onClose();
      alert('University added successfully! ✅');
    },
    onError: (err: any) => {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let msg = "Error creating university";
      if (status === 401 || status === 403) {
        msg = "Please log in to add a university.";
      } else if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        msg = detail.map((d: any) => d.msg).join("; ");
      } else if (detail?.message) {
        msg = detail.message;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const region = formData.get('region');
    const desc = formData.get('description');
    mutation.mutate({
      name: String(formData.get('name') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      region: typeof region === 'string' ? region : '',
      description: desc && String(desc).trim() ? String(desc).trim() : undefined,
      image: imageFile || undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl border border-base-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2"><Building2 className="text-primary"/> Add University</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        {error && <div className="alert alert-error text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" placeholder="University Name" className="input input-bordered w-full" required />
          <input name="city" placeholder="City" className="input input-bordered w-full" required />
          <select name="region" className="select select-bordered w-full" defaultValue="" required>
            <option value="" disabled>Wybierz województwo</option>
            {POLISH_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input name="description" placeholder="Description (optional)" className="input input-bordered w-full" />
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 border-2 border-dashed rounded-xl p-4">
              <Upload className="text-base-content/50"/>
              <span className="label-text">Upload Logo (Optional)</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
            </label>
            {imageFile && <span className="text-xs mt-1 text-success">{imageFile.name} selected</span>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}