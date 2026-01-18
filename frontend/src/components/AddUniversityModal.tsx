import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, MapPin, Upload } from 'lucide-react';
import { createUniversity } from '../utils/api';

interface Props { isOpen: boolean; onClose: () => void; }

export function AddUniversityModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universities'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.detail || "Error creating university")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    mutation.mutate({
      name: formData.get('name') as string,
      city: formData.get('city') as string,
      region: formData.get('region') as string,
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
          <select name="region" className="select select-bordered w-full" required>
            <option value="" disabled selected>Select Region</option>
            <option value="Małopolskie">Małopolskie</option>
            <option value="Mazowieckie">Mazowieckie</option>
            <option value="Dolnośląskie">Dolnośląskie</option>
            {/* Add more regions */}
          </select>
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