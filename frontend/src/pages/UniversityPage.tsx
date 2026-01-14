import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, ArrowLeft, CheckCircle, User as UserIcon } from 'lucide-react';
import { API_URL, getAuthHeader } from '../utils/api';

export function UniversityPage({ token, t, lang }: { token: string | null, t: any, lang: string }) {
  const { uniId } = useParams();
  const queryClient = useQueryClient();

  // Pobierz dane o uczelni (nazwę) i notatki
  const { data: unis } = useQuery({ queryKey: ['unis'], queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data) });
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', uniId],
    queryFn: async () => axios.get(`${API_URL}/notes?university_id=${uniId}`).then(r => r.data)
  });

  // @ts-ignore
  const currentUni = unis?.find((u: any) => u.id === Number(uniId));

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => axios.post(`${API_URL}/notes`, formData, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { alert(t.noteAdded); queryClient.invalidateQueries({ queryKey: ['notes', uniId] }); },
    onError: () => alert(t.uploadError)
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    // Wymuszamy ID uczelni z URL
    formData.append('university_id', uniId!);
    uploadMutation.mutate(formData);
    form.reset();
  };

  if(!currentUni) return <div className="p-10 text-center">Ładowanie uczelni...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <Link to={`/region/${currentUni.region}`} className="btn btn-ghost btn-sm gap-2 mb-2 pl-0"><ArrowLeft size={16}/> Wróć do regionu</Link>
          <h1 className="text-3xl font-bold">{lang === 'pl' ? currentUni.name_pl : currentUni.name_en}</h1>
        </div>
        {token && (
           <button onClick={() => (document.getElementById('upload_modal') as HTMLDialogElement).showModal()} className="btn btn-primary text-white gap-2">
             <Upload size={18}/> {t.uploadTitle}
           </button>
        )}
      </div>

      {/* Upload Modal */}
      <dialog id="upload_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{t.uploadTitle}</h3>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <input name="title" placeholder={t.titlePlaceholder} className="input input-bordered" required />
            <textarea name="content" placeholder={t.descPlaceholder} className="textarea textarea-bordered h-32" required />
            <input type="file" name="image" className="file-input file-input-bordered w-full" />
            <button className="btn btn-primary text-white w-full">{t.submitBtn}</button>
          </form>
          <div className="modal-action">
            <form method="dialog"><button className="btn">Anuluj</button></form>
          </div>
        </div>
      </dialog>

      {/* Notes Grid */}
      {isLoading ? <span className="loading loading-dots loading-lg"></span> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notes?.length === 0 && <div className="col-span-2 text-center py-10 opacity-50 bg-base-100 rounded-xl border border-dashed border-base-300">Brak notatek. Bądź pierwszy!</div>}

          {notes?.map((note: any) => (
            <div key={note.id} className="card bg-base-100 shadow-md border border-base-200">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="card-title text-lg">{note.title}</h3>
                  <div className="badge badge-accent badge-outline">{t.score}: {note.score}</div>
                </div>
                <p className="whitespace-pre-wrap text-sm opacity-80 my-2 line-clamp-4">{note.content}</p>
                {note.image_url && (
                  <img src={`${API_URL}${note.image_url}`} className="rounded-lg h-48 w-full object-cover mt-2 bg-base-200" alt="Note" />
                )}
                <div className="divider my-2"></div>
                <div className="flex justify-between text-xs opacity-60 items-center">
                   <div className="flex items-center gap-1">
                      <UserIcon size={14}/>
                      <span className={note.author.is_verified ? "text-primary font-bold" : ""}>
                        {note.author.nickname || note.author.email}
                      </span>
                      {note.author.is_verified && <CheckCircle size={12} className="text-blue-500" />}
                   </div>
                   <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}