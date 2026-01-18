import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, BookOpen, Layers } from 'lucide-react';
import { getFaculties, getFields, getSubjects, createNote, createFieldOfStudy, createSubject } from '../utils/api';

interface Props { universityId: number; isOpen: boolean; onClose: () => void; t: any; lang: string; }

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notes'] }); onClose(); }
  });

  const fieldMutation = useMutation({
    mutationFn: (name: string) => createFieldOfStudy({ name, degree_level: 'Bachelor', faculty_id: facultyId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fields', facultyId] })
  });

  const subjectMutation = useMutation({
    mutationFn: (name: string) => createSubject({ name, semester: 1, field_of_study_id: fieldId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects', fieldId] })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return alert("Select subject");
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    fd.append('university_id', universityId.toString());
    fd.append('subject_id', subjectId.toString());
    noteMutation.mutate(fd);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-2xl rounded-2xl shadow-xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between">
          <h3 className="font-bold text-lg">Upload Material</h3>
          <button onClick={onClose}><X/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* HIERARCHY SELECTORS */}
          <select className="select select-bordered w-full" onChange={e => setFacultyId(Number(e.target.value))}>
            <option value="">Select Faculty</option>
            {faculties?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          {facultyId && (
            <div className="flex gap-2">
              <select className="select select-bordered w-full" onChange={e => setFieldId(Number(e.target.value))}>
                <option value="">Select Field</option>
                {fields?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <div className="join">
                <input className="input input-bordered join-item w-32" placeholder="New Field" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                <button type="button" onClick={() => fieldMutation.mutate(newFieldName)} className="btn join-item">+</button>
              </div>
            </div>
          )}

          {fieldId && (
            <div className="flex gap-2">
              <select className="select select-bordered w-full" onChange={e => setSubjectId(Number(e.target.value))}>
                <option value="">Select Subject</option>
                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="join">
                <input className="input input-bordered join-item w-32" placeholder="New Subject" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
                <button type="button" onClick={() => subjectMutation.mutate(newSubjectName)} className="btn join-item">+</button>
              </div>
            </div>
          )}

          {/* NOTE FORM */}
          {subjectId && (
            <form id="note-form" onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <input name="title" placeholder="Title" className="input input-bordered w-full" required />
              <textarea name="content" placeholder="Content/Description" className="textarea textarea-bordered w-full h-32"></textarea>
              <input type="file" name="image" className="file-input file-input-bordered w-full" />
            </form>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button type="submit" form="note-form" className="btn btn-primary" disabled={!subjectId}>Upload</button>
        </div>
      </div>
    </div>
  );
}