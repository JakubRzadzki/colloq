import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, FileText } from 'lucide-react';
import { getUniversities, getFaculties, getFields, getSubjects, createNote, createFieldOfStudy, createSubject } from '../utils/api';
import { Captcha } from './Captcha';

const MAX_FILES = 10;

interface Props {
  /** When provided (e.g. from University page), skip university step. When null/undefined, user picks university first (add note by subject). */
  universityId?: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AddNoteModal({ universityId: propUniversityId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const universityId = propUniversityId ?? selectedUniversityId;
  const showUniversityStep = propUniversityId == null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedUniversityId(null);
      setFacultyId(null);
      setFieldId(null);
      setSubjectId(null);
      setSelectedFiles([]);
      setError('');
    }
  }, [isOpen]);

  // New Item States
  const [newFieldName, setNewFieldName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [captchaValid, setCaptchaValid] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  const { data: universities = [] } = useQuery({ queryKey: ['unis'], queryFn: () => getUniversities(), enabled: isOpen && showUniversityStep });
  const { data: faculties = [] } = useQuery({ queryKey: ['faculties', universityId], queryFn: () => getFaculties(universityId!), enabled: isOpen && !!universityId });
  const { data: fields = [] } = useQuery({ queryKey: ['fields', facultyId], queryFn: () => getFields(facultyId!), enabled: !!facultyId });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', fieldId], queryFn: () => getSubjects(fieldId!), enabled: !!fieldId });

  const noteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['home'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        onClose();
    },
    onError: () => setError("Nie udało się dodać notatki.")
  });

  const fieldMutation = useMutation({
    mutationFn: (name: string) => createFieldOfStudy({ name, degree_level: 'Bachelor', faculty_id: facultyId! }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['fields', facultyId] });
        setNewFieldName('');
    }
  });

  const subjectMutation = useMutation({
    mutationFn: (name: string) => createSubject({ name, semester: 1, field_of_study_id: fieldId! }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['subjects', fieldId] });
        setNewSubjectName('');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > MAX_FILES) {
      setError(`Maksymalnie ${MAX_FILES} plików na notatkę.`);
      setSelectedFiles(files.slice(0, MAX_FILES));
    } else {
      setError('');
      setSelectedFiles(files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId || !subjectId) {
      setError("Wybierz przedmiot (i uczelnię, jeśli dodajesz notatkę spoza strony uczelni).");
      return;
    }
    if (!captchaValid || honeypot) {
      setError("Uzupełnij zabezpieczenie antyspamowe.");
      return;
    }
    setError('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    fd.append('university_id', universityId.toString());
    fd.append('subject_id', subjectId.toString());
    selectedFiles.forEach((file) => fd.append('files', file));
    noteMutation.mutate(fd);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-base-100 w-full max-w-2xl rounded-2xl shadow-2xl h-[85vh] flex flex-col border border-base-200">
        <div className="p-4 border-b flex justify-between items-center bg-base-200/50 rounded-t-2xl">
          <h3 className="font-bold text-lg">Upload Material</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 0: University (only when not opened from a university page) */}
          {showUniversityStep && (
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">1. Uczelnia</span></label>
              <select className="select select-bordered w-full" value={selectedUniversityId ?? ''} onChange={e => { const v = e.target.value; setSelectedUniversityId(v ? Number(v) : null); setFacultyId(null); setFieldId(null); setSubjectId(null); }}>
                <option value="">-- Wybierz uczelnię --</option>
                {universities?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          {/* HIERARCHY: Faculty → Field → Subject */}
          <div className="form-control">
             <label className="label"><span className="label-text font-semibold">{showUniversityStep ? '2' : '1'}. Wydział</span></label>
             <select className="select select-bordered w-full" value={facultyId ?? ''} onChange={e => { setFacultyId(Number(e.target.value) || null); setFieldId(null); setSubjectId(null); }} disabled={!universityId}>
                <option value="">-- Wybierz wydział --</option>
                {faculties?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
             </select>
          </div>

          {facultyId && (
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">{showUniversityStep ? '3' : '2'}. Kierunek</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered w-full" value={fieldId ?? ''} onChange={e => { setFieldId(e.target.value ? Number(e.target.value) : null); setSubjectId(null); }}>
                    <option value="">-- Wybierz kierunek --</option>
                    {fields?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <div className="join">
                    <input className="input input-bordered join-item w-32" placeholder="Add new..." value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                    <button type="button" onClick={() => fieldMutation.mutate(newFieldName)} className="btn btn-primary join-item" disabled={!newFieldName}><Plus size={16}/></button>
                </div>
              </div>
            </div>
          )}

          {fieldId && (
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">{showUniversityStep ? '4' : '3'}. Przedmiot</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered w-full" value={subjectId ?? ''} onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Wybierz przedmiot --</option>
                    {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="join">
                    <input className="input input-bordered join-item w-32" placeholder="Add new..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
                    <button type="button" onClick={() => subjectMutation.mutate(newSubjectName)} className="btn btn-primary join-item" disabled={!newSubjectName}><Plus size={16}/></button>
                </div>
              </div>
            </div>
          )}

          {/* NOTE FORM */}
          {subjectId && (
            <form id="note-form" onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
              <div className="form-control">
                 <label className="label"><span className="label-text font-semibold">Title</span></label>
                 <input name="title" placeholder="e.g. Exam Notes 2024" className="input input-bordered w-full" required />
              </div>

              <div className="form-control">
                 <label className="label"><span className="label-text font-semibold">Description / Content</span></label>
                 <textarea name="content" placeholder="Paste text or describe the file..." className="textarea textarea-bordered w-full h-32"></textarea>
              </div>

              <div className="form-control">
                 <label className="label"><span className="label-text font-semibold">Attachments (up to {MAX_FILES} files)</span></label>
                 <input
                   type="file"
                   multiple
                   accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                   onChange={handleFileChange}
                   className="file-input file-input-bordered w-full"
                 />
                 {selectedFiles.length > 0 && (
                   <div className="mt-2 space-y-1.5">
                     <p className="text-sm opacity-70">Selected: {selectedFiles.length} file(s)</p>
                     <ul className="space-y-1">
                       {selectedFiles.map((f, i) => (
                         <li key={i} className="flex items-center gap-2 text-sm bg-base-200 rounded-lg px-3 py-2">
                           <FileText size={14} className="opacity-60" />
                           <span className="truncate flex-1">{f.name}</span>
                           <span className="text-xs opacity-50">{(f.size / 1024).toFixed(1)} KB</span>
                           <button type="button" onClick={() => removeFile(i)} className="btn btn-ghost btn-xs text-error">
                             <X size={14} />
                           </button>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
              </div>

              <Captcha onValidChange={setCaptchaValid} honeypotValue={honeypot} setHoneypotValue={setHoneypot} />
            </form>
          )}
        </div>

        <div className="p-4 border-t bg-base-100 rounded-b-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {error && (
            <p className="text-error text-sm flex-1 text-left" role="alert">{error}</p>
          )}
          <button type="submit" form="note-form" className="btn btn-primary px-8" disabled={!universityId || !subjectId || noteMutation.isPending || !captchaValid}>
            {noteMutation.isPending ? <span className="loading loading-spinner"></span> : "Dodaj notatkę"}
          </button>
        </div>
      </div>
    </div>
  );
}