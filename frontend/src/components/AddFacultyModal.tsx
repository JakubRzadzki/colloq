import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Layers, Upload } from 'lucide-react';
import { createFaculty } from '../utils/api';

interface Props { isOpen: boolean; onClose: () => void; universityId: number; universityName: string; }

export function AddFacultyModal({ isOpen, onClose, universityId, universityName }: Props) {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: createFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculties', universityId] });
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.detail)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData();
    fd.append('name', (form.elements.namedItem('name') as HTMLInputElement).value);
    fd.append('university_id', universityId.toString());
    if (imageFile) fd.append('image', imageFile);
    mutation.mutate(fd);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex gap-2"><Layers/> Add Faculty to {universityName}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" placeholder="Faculty Name" className="input input-bordered w-full" required />
          <div className="form-control">
             <label className="label cursor-pointer justify-start gap-4 border-2 border-dashed rounded-lg p-4">
                <Upload/> <span>Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
             </label>
          </div>
          <button className="btn btn-primary w-full" disabled={mutation.isPending}>Submit</button>
        </form>
      </div>
    </div>
  );
}