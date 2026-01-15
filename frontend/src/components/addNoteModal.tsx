import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';
import { Upload, Link as LinkIcon, Video, BookOpen, Layers, X, Plus, Image as ImageIcon, Building, CheckCircle } from 'lucide-react';

interface Props {
  universityId: number;
  isOpen: boolean;
  onClose: () => void;
  t: any;
  lang: string;
}

export function AddNoteModal({ universityId, isOpen, onClose, t, lang }: Props) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  // Selections
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  // States for adding new items
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [newFacultyName, setNewFacultyName] = useState('');
  const [facultyImage, setFacultyImage] = useState<File | null>(null);

  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLevel, setNewFieldLevel] = useState('Inżynierskie');

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSemester, setNewSubjectSemester] = useState(1);

  // --- QUERIES ---

  const { data: faculties, refetch: refetchFaculties } = useQuery({
    queryKey: ['faculties', universityId],
    queryFn: () => axios.get(`${API_URL}/universities/${universityId}/faculties`).then(r => r.data),
    enabled: !!universityId && isOpen
  });

  const { data: fields, refetch: refetchFields } = useQuery({
    queryKey: ['fields', selectedFaculty],
    queryFn: () => axios.get(`${API_URL}/faculties/${selectedFaculty}/fields`).then(r => r.data),
    enabled: !!selectedFaculty && isOpen
  });

  const { data: subjects, refetch: refetchSubjects } = useQuery({
    queryKey: ['subjects', selectedField],
    queryFn: () => axios.get(`${API_URL}/fields/${selectedField}/subjects`).then(r => r.data),
    enabled: !!selectedField && isOpen
  });

  // --- EFFECTS ---

  useEffect(() => {
    setSelectedFaculty(null);
    setSelectedField(null);
    setSelectedSubject(null);
    setShowAddFaculty(false);
  }, [universityId, isOpen]);

  useEffect(() => {
    setSelectedField(null);
    setSelectedSubject(null);
    setShowAddField(false);
  }, [selectedFaculty]);

  useEffect(() => {
    setSelectedSubject(null);
    setShowAddSubject(false);
  }, [selectedField]);

  // --- MUTATIONS ---

  const addFacultyMutation = useMutation({
    mutationFn: (data: FormData) =>
      axios.post(`${API_URL}/faculties`, data, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      alert(lang === 'pl' ? 'Wydział wysłany do weryfikacji!' : 'Faculty submitted for approval!');
      queryClient.invalidateQueries({ queryKey: ['faculties'] });
      setShowAddFaculty(false);
      setNewFacultyName('');
      setFacultyImage(null);
      refetchFaculties();
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Error adding faculty')
  });

  const addFieldMutation = useMutation({
    mutationFn: (data: any) =>
      axios.post(`${API_URL}/fields`, data, { headers: getAuthHeader() }),
    onSuccess: () => {
      alert(lang === 'pl' ? 'Kierunek wysłany do weryfikacji!' : 'Field submitted for approval!');
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      setShowAddField(false);
      setNewFieldName('');
      refetchFields();
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Error adding field')
  });

  const addSubjectMutation = useMutation({
    mutationFn: (data: any) =>
      axios.post(`${API_URL}/subjects`, data, { headers: getAuthHeader() }),
    onSuccess: () => {
      alert(lang === 'pl' ? 'Przedmiot wysłany do weryfikacji!' : 'Subject submitted for approval!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowAddSubject(false);
      setNewSubjectName('');
      refetchSubjects();
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Error adding subject')
  });

  const addNoteMutation = useMutation({
    mutationFn: (formData: FormData) =>
      axios.post(`${API_URL}/notes`, formData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      alert(t.noteSubmitted || 'Notatka wysłana do weryfikacji!');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (formRef.current) formRef.current.reset();
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Error submitting note')
  });

  // --- SUBMIT HANDLER ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Adding Faculty
    if (showAddFaculty && newFacultyName) {
      const formData = new FormData();
      formData.append('name', newFacultyName);
      formData.append('university_id', universityId.toString());
      if (facultyImage) {
        formData.append('image', facultyImage);
      }
      addFacultyMutation.mutate(formData);
      return;
    }

    // 2. Adding Field
    if (showAddField && newFieldName && selectedFaculty) {
      addFieldMutation.mutate({
        name: newFieldName,
        degree_level: newFieldLevel,
        faculty_id: selectedFaculty
      });
      return;
    }

    // 3. Adding Subject
    if (showAddSubject && newSubjectName && selectedField) {
      addSubjectMutation.mutate({
        name: newSubjectName,
        semester: newSubjectSemester,
        field_of_study_id: selectedField
      });
      return;
    }

    // 4. Adding Note
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Validate: Content or Image required
    const content = formData.get('content') as string;
    const image = formData.get('image') as File;

    if (!content && (!image || image.size === 0)) {
        alert(lang === 'pl' ? 'Musisz dodać treść notatki lub zdjęcie.' : 'Content or image is required.');
        return;
    }

    formData.append('university_id', universityId.toString());
    if (selectedSubject) {
      formData.append('subject_id', selectedSubject.toString());
    }

    addNoteMutation.mutate(formData);
  };

  const isSubmitting = addNoteMutation.isPending || addFacultyMutation.isPending || addFieldMutation.isPending || addSubjectMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-100 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-base-300">

        {/* Header */}
        <div className="p-5 border-b border-base-200 flex justify-between items-center bg-base-100 sticky top-0 z-10">
          <h3 className="font-bold text-2xl flex items-center gap-2">
            <Upload className="text-primary" />
            {t.uploadMaterials || 'Dodaj materiały'}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm hover:bg-base-200">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-1 bg-base-50/50">
          <form id="add-note-form" ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* 1. SELECTION: FACULTY */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex gap-2 font-semibold text-base">
                  <Building size={18} className="text-primary" /> {t.selectFaculty || 'Wydział'}
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  className="select select-bordered w-full focus:select-primary transition-all"
                  onChange={e => setSelectedFaculty(e.target.value ? Number(e.target.value) : null)}
                  value={selectedFaculty || ''}
                  disabled={showAddFaculty}
                  required={!showAddFaculty}
                >
                  <option value="" disabled>-- {t.selectFaculty || 'Wybierz wydział'} --</option>
                  {faculties?.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`btn btn-square ${showAddFaculty ? 'btn-error text-white' : 'btn-ghost border-base-300 bg-base-100'}`}
                  onClick={() => {
                    setShowAddFaculty(!showAddFaculty);
                    setShowAddField(false);
                    setShowAddSubject(false);
                    if (!showAddFaculty) setSelectedFaculty(null);
                  }}
                  title={showAddFaculty ? "Anuluj dodawanie" : "Dodaj nowy wydział"}
                >
                  {showAddFaculty ? <X size={20} /> : <Plus size={20} />}
                </button>
              </div>

              {/* Add Faculty Form */}
              {showAddFaculty && (
                <div className="mt-4 p-5 bg-base-100 border border-primary/20 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                  <div className="alert alert-info shadow-none bg-info/10 text-info-content mb-3 p-3">
                    <Building size={18} />
                    <span className="text-sm font-medium">
                      {lang === 'pl' ? 'Dodajesz nowy wydział' : 'Adding new faculty'}
                    </span>
                  </div>
                  <div className="space-y-3">
                      <input
                        placeholder={t.facultyName || 'Nazwa wydziału (np. Wydział Informatyki)'}
                        className="input input-bordered w-full"
                        value={newFacultyName}
                        onChange={e => setNewFacultyName(e.target.value)}
                        required={showAddFaculty}
                      />
                      <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs opacity-70">Zdjęcie wydziału (opcjonalne)</span>
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            className="file-input file-input-bordered file-input-sm w-full"
                            onChange={e => setFacultyImage(e.target.files?.[0] || null)}
                        />
                      </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SELECTION: FIELD */}
            {!showAddFaculty && selectedFaculty && (
              <div className="form-control animate-in fade-in slide-in-from-top-1">
                <label className="label">
                  <span className="label-text flex gap-2 font-semibold text-base">
                    <Layers size={18} className="text-secondary" /> {t.selectField || 'Kierunek'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered w-full focus:select-secondary transition-all"
                    onChange={e => setSelectedField(e.target.value ? Number(e.target.value) : null)}
                    value={selectedField || ''}
                    disabled={showAddField}
                    required={!showAddField}
                  >
                    <option value="" disabled>-- {t.selectField || 'Wybierz kierunek'} --</option>
                    {fields?.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.degree_level})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`btn btn-square ${showAddField ? 'btn-error text-white' : 'btn-ghost border-base-300 bg-base-100'}`}
                    onClick={() => {
                      setShowAddField(!showAddField);
                      setShowAddSubject(false);
                      if (!showAddField) setSelectedField(null);
                    }}
                  >
                    {showAddField ? <X size={20} /> : <Plus size={20} />}
                  </button>
                </div>

                {showAddField && (
                  <div className="mt-4 p-5 bg-base-100 border border-secondary/20 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                    <div className="alert alert-info shadow-none bg-secondary/10 text-secondary-content mb-3 p-3">
                      <Layers size={18} />
                      <span className="text-sm font-medium">
                        {lang === 'pl' ? 'Dodajesz nowy kierunek' : 'Adding new field'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <input
                          placeholder={t.fieldName || 'Nazwa kierunku'}
                          className="input input-bordered col-span-2"
                          value={newFieldName}
                          onChange={e => setNewFieldName(e.target.value)}
                          required={showAddField}
                        />
                        <select
                          className="select select-bordered"
                          value={newFieldLevel}
                          onChange={e => setNewFieldLevel(e.target.value)}
                        >
                          <option value="Inżynierskie">Inżynierskie</option>
                          <option value="Licencjat">Licencjat</option>
                          <option value="Magisterskie">Magisterskie</option>
                        </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. SELECTION: SUBJECT */}
            {!showAddFaculty && !showAddField && selectedField && (
              <div className="form-control animate-in fade-in slide-in-from-top-1">
                <label className="label">
                  <span className="label-text flex gap-2 font-semibold text-base">
                    <BookOpen size={18} className="text-accent" /> {t.selectSubject || 'Przedmiot'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered w-full focus:select-accent transition-all"
                    onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                    value={selectedSubject || ''}
                    disabled={showAddSubject}
                    required={!showAddSubject}
                  >
                    <option value="" disabled>-- {t.selectSubject || 'Wybierz przedmiot'} --</option>
                    {subjects?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Sem. {s.semester})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`btn btn-square ${showAddSubject ? 'btn-error text-white' : 'btn-ghost border-base-300 bg-base-100'}`}
                    onClick={() => {
                      setShowAddSubject(!showAddSubject);
                      if (!showAddSubject) setSelectedSubject(null);
                    }}
                  >
                    {showAddSubject ? <X size={20} /> : <Plus size={20} />}
                  </button>
                </div>

                {showAddSubject && (
                  <div className="mt-4 p-5 bg-base-100 border border-accent/20 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                    <div className="alert alert-info shadow-none bg-accent/10 text-accent-content mb-3 p-3">
                      <BookOpen size={18} />
                      <span className="text-sm font-medium">
                        {lang === 'pl' ? 'Dodajesz nowy przedmiot' : 'Adding new subject'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                        <input
                          placeholder={t.subjectName || 'Nazwa przedmiotu'}
                          className="input input-bordered w-full"
                          value={newSubjectName}
                          onChange={e => setNewSubjectName(e.target.value)}
                          required={showAddSubject}
                        />
                        <input
                          type="number"
                          placeholder="Sem."
                          className="input input-bordered w-24"
                          min={1}
                          max={10}
                          value={newSubjectSemester}
                          onChange={e => setNewSubjectSemester(parseInt(e.target.value))}
                          required={showAddSubject}
                        />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. CONTENT FORM */}
            {!showAddFaculty && !showAddField && !showAddSubject && selectedSubject && (
              <div className="bg-base-100 p-5 rounded-xl border border-base-200 shadow-sm animate-in fade-in slide-in-from-top-2 mt-2">
                <h4 className="font-bold mb-4 opacity-80 uppercase text-xs tracking-wider">
                    {lang === 'pl' ? 'Szczegóły Notatki' : 'Note Details'}
                </h4>

                <div className="space-y-4">
                    <input
                      name="title"
                      placeholder={t.titleOptional || 'Tytuł (opcjonalnie)'}
                      className="input input-bordered w-full font-bold focus:border-primary"
                    />

                    <textarea
                      name="content"
                      placeholder={t.contentOptional || 'Treść notatki / Opis...'}
                      className="textarea textarea-bordered h-32 w-full focus:border-primary"
                    />

                    <div className="divider text-xs uppercase opacity-50 m-0">{t.multimedia || 'Multimedia'}</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text flex gap-2 items-center text-xs uppercase font-bold opacity-60">
                            <LinkIcon size={12} /> {t.linkUrl || 'Link'}
                          </span>
                        </label>
                        <input
                          name="link_url"
                          type="url"
                          placeholder="https://..."
                          className="input input-bordered w-full input-sm"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text flex gap-2 items-center text-xs uppercase font-bold opacity-60">
                            <Video size={12} /> {t.videoUrl || 'Wideo'}
                          </span>
                        </label>
                        <input
                          name="video_url"
                          type="url"
                          placeholder="https://youtube.com/..."
                          className="input input-bordered w-full input-sm"
                        />
                      </div>
                    </div>

                    <div className="form-control bg-base-200/50 p-3 rounded-lg border border-dashed border-base-300">
                      <label className="label cursor-pointer justify-start gap-4">
                        <div className="p-3 bg-base-100 rounded-full shadow-sm">
                            <ImageIcon size={24} className="text-primary" />
                        </div>
                        <div className="flex-1">
                             <span className="label-text font-semibold block">{t.imageFile || 'Zdjęcie / Skan'}</span>
                             <span className="text-xs opacity-50 block">JPG, PNG, WEBP (Max 5MB)</span>
                        </div>
                        <input
                            type="file"
                            name="image"
                            className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                            accept="image/*"
                        />
                      </label>
                    </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-base-200 flex justify-end gap-3 bg-base-100">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            {t.cancel || 'Anuluj'}
          </button>
          <button
            type="submit"
            form="add-note-form"
            className="btn btn-primary text-white min-w-[120px]"
            disabled={
                isSubmitting ||
                (!showAddFaculty && !selectedFaculty) // Disable if main selection is incomplete
            }
          >
            {isSubmitting && <span className="loading loading-spinner loading-xs"></span>}
            {t.submit || 'Wyślij'}
          </button>
        </div>
      </div>
    </div>
  );
}