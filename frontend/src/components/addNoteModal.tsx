import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { getFaculties, getFields, getSubjects, createNote, createFieldOfStudy, createSubject } from '../utils/api';

interface Props {
  universityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AddNoteModal({ universityId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  // New Item States
  const [newFieldName, setNewFieldName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  const { data: faculties } = useQuery({ queryKey: ['faculties', universityId], queryFn: () => getFaculties(universityId), enabled: isOpen });
  const { data: fields } = useQuery({ queryKey: ['fields', facultyId], queryFn: () => getFields(facultyId!), enabled: !!facultyId });
  const { data: subjects } = useQuery({ queryKey: ['subjects', fieldId], queryFn: () => getSubjects(fieldId!), enabled: !!fieldId });

  const noteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        onClose();
        alert("Note uploaded successfully!");
    },
    onError: () => alert("Failed to upload note.")
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return alert("Please select a subject.");
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    fd.append('university_id', universityId.toString());
    fd.append('subject_id', subjectId.toString());
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
          {/* HIERARCHY SELECTORS */}
          <div className="form-control">
             <label className="label"><span className="label-text font-semibold">1. Select Faculty</span></label>
             <select className="select select-bordered w-full" onChange={e => { setFacultyId(Number(e.target.value)); setFieldId(null); setSubjectId(null); }}>
                <option value="">-- Choose Faculty --</option>
                {faculties?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
             </select>
          </div>

          {facultyId && (
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">2. Select Field of Study</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered w-full" onChange={e => { setFieldId(Number(e.target.value)); setSubjectId(null); }}>
                    <option value="">-- Choose Field --</option>
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
              <label className="label"><span className="label-text font-semibold">3. Select Subject</span></label>
              <div className="flex gap-2">
                <select className="select select-bordered w-full" onChange={e => setSubjectId(Number(e.target.value))}>
                    <option value="">-- Choose Subject --</option>
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
                 <label className="label"><span className="label-text font-semibold">Attachment (Image/PDF)</span></label>
                 <input type="file" name="image" className="file-input file-input-bordered w-full" />
              </div>
            </form>
          )}
        </div>

        <div className="p-4 border-t bg-base-100 rounded-b-2xl flex justify-end">
          <button type="submit" form="note-form" className="btn btn-primary px-8" disabled={!subjectId || noteMutation.isPending}>
            {noteMutation.isPending ? <span className="loading loading-spinner"></span> : "Upload Note"}
          </button>
        </div>
      </div>
    </div>
  );
}