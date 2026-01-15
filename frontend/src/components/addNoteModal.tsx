import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';
import { Upload, Link as LinkIcon, Video, BookOpen, Layers, X } from 'lucide-react';

interface Props {
  universityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AddNoteModal({ universityId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const { data: fields } = useQuery({
    queryKey: ['fields', universityId],
    queryFn: () => axios.get(`${API_URL}/universities/${universityId}/fields`).then(r => r.data),
    enabled: !!universityId && isOpen
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', selectedField],
    queryFn: () => axios.get(`${API_URL}/fields/${selectedField}/subjects`).then(r => r.data),
    enabled: !!selectedField
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      axios.post(`${API_URL}/notes`, formData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      alert("Notatka dodana!");
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onClose();
    },
    onError: (err: any) => alert("Błąd: " + (err.response?.data?.detail || err.message))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append('university_id', universityId.toString());
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-base-100 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-base-200 flex justify-between items-center">
          <h3 className="font-bold text-2xl flex items-center gap-2">
            <Upload className="text-primary"/> Dodaj Materiały
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm"><X size={20}/></button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="add-note-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Wybór Kierunku i Przedmiotu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text flex gap-2 font-semibold"><Layers size={16}/> Kierunek</span></label>
                <select className="select select-bordered w-full" onChange={e => setSelectedField(e.target.value)} value={selectedField} required>
                  <option value="" disabled>-- Wybierz --</option>
                  {fields?.map((f: any) => <option key={f.id} value={f.id}>{f.name} ({f.degree_level})</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text flex gap-2 font-semibold"><BookOpen size={16}/> Przedmiot</span></label>
                <select name="subject_id" className="select select-bordered w-full" onChange={e => setSelectedSubject(e.target.value)} value={selectedSubject} disabled={!selectedField} required>
                  <option value="" disabled>-- Wybierz --</option>
                  {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name} (Sem. {s.semester})</option>)}
                </select>
              </div>
            </div>

            <input name="title" placeholder="Tytuł notatki" className="input input-bordered w-full font-bold" required />
            <textarea name="content" placeholder="Opis..." className="textarea textarea-bordered h-32" required />

            <div className="divider text-xs uppercase opacity-50">Multimedia</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text flex gap-2"><LinkIcon size={14}/> Link</span></label>
                <input name="link_url" type="url" placeholder="https://..." className="input input-bordered w-full input-sm" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text flex gap-2"><Video size={14}/> Wideo</span></label>
                <input name="video_url" type="url" placeholder="https://youtube.com/..." className="input input-bordered w-full input-sm" />
              </div>
            </div>

            <div className="form-control">
               <label className="label"><span className="label-text">Plik (Zdjęcie/Skan)</span></label>
               <input type="file" name="image" className="file-input file-input-bordered w-full" accept="image/*" />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-base-200 flex justify-end gap-2">
           <button type="button" className="btn" onClick={onClose}>Anuluj</button>
           <button type="submit" form="add-note-form" className="btn btn-primary text-white">Wyślij</button>
        </div>
      </div>
    </div>
  );
}