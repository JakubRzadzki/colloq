import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Layers, Upload } from 'lucide-react';
import { createFaculty } from '../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  universityId: number;
  universityName: string;
}

export function AddFacultyModal({ isOpen, onClose, universityId, universityName }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setImageFile(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: createFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculties', universityId] });
      onClose();
      alert('Wydział dodany pomyślnie! ✅');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { detail?: string | Array<{ msg: string }> } }; message?: string };
      const detail = e.response?.data?.detail;
      let msg = 'Błąd podczas dodawania wydziału.';
      if (e.response?.status === 401 || e.response?.status === 403) {
        msg = 'Zaloguj się, aby dodać wydział.';
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        msg = detail.map((d) => d.msg).join('; ');
      } else if (e.message) {
        msg = e.message;
      }
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData();
    fd.append('name', (form.elements.namedItem('name') as HTMLInputElement).value.trim());
    fd.append('university_id', universityId.toString());
    const desc = (form.elements.namedItem('description') as HTMLInputElement)?.value?.trim();
    if (desc) fd.append('description', desc);
    if (imageFile) fd.append('image', imageFile);
    mutation.mutate(fd);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl border border-base-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Layers className="text-primary" /> Dodaj wydział – {universityName}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-base-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        {error && <div className="alert alert-error text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Nazwa wydziału"
            className="input input-bordered w-full"
            required
          />
          <input
            name="description"
            placeholder="Opis (opcjonalnie)"
            className="input input-bordered w-full"
          />
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4 border-2 border-dashed rounded-xl p-4 hover:border-primary/30 transition-colors">
              <Upload className="text-base-content/50" size={20} />
              <span className="label-text">Logo wydziału (opcjonalnie)</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>
            {imageFile && (
              <span className="text-xs mt-1 text-success">{imageFile.name} wybrano</span>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Dodawanie...' : 'Dodaj wydział'}
          </button>
        </form>
      </div>
    </div>
  );
}
