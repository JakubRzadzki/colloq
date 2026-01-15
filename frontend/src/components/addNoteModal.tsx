import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '../utils/api';
import { Upload, Link as LinkIcon, Video, BookOpen, Layers, X, Plus, Minus } from 'lucide-react';

interface Props {
  universityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function AddNoteModal({ universityId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSemester, setNewSubjectSemester] = useState(1);

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

  const createFieldMutation = useMutation({
    mutationFn: (data: { name: string; degree_level: string; university_id: number }) =>
      axios.post(`${API_URL}/fields`, data, { headers: getAuthHeader() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', universityId] });
      setShowAddField(false);
      setNewFieldName('');
      alert("Kierunek dodany i oczekuje na weryfikację przez administratora.");
    },
    onError: (err: any) => alert("Błąd przy dodawaniu kierunku: " + (err.response?.data?.detail || err.message))
  });

  const createSubjectMutation = useMutation({
    mutationFn: (data: { name: string; semester: number; field_of_study_id: number }) =>
      axios.post(`${API_URL}/subjects`, data, { headers: getAuthHeader() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', selectedField] });
      setShowAddSubject(false);
      setNewSubjectName('');
      setNewSubjectSemester(1);
      alert("Przedmiot dodany i oczekuje na weryfikację przez administratora.");
    },
    onError: (err: any) => alert("Błąd przy dodawaniu przedmiotu: " + (err.response?.data?.detail || err.message))
  });

  const noteMutation = useMutation({
    mutationFn: (formData: FormData) =>
      axios.post(`${API_URL}/notes`, formData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: () => {
      alert("Notatka dodana i oczekuje na moderację!");
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onClose();
    },
    onError: (err: any) => alert("Błąd: " + (err.response?.data?.detail || err.message))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showAddField) {
      if (!newFieldName.trim()) {
        alert("Wprowadź nazwę kierunku!");
        return;
      }
      createFieldMutation.mutate({
        name: newFieldName,
        degree_level: "I stopnia",
        university_id: universityId
      });
      return;
    }

    if (showAddSubject) {
      if (!newSubjectName.trim()) {
        alert("Wprowadź nazwę przedmiotu!");
        return;
      }
      createSubjectMutation.mutate({
        name: newSubjectName,
        semester: newSubjectSemester,
        field_of_study_id: parseInt(selectedField)
      });
      return;
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append('university_id', universityId.toString());

    const content = formData.get('content') as string;
    const image = formData.get('image') as File;

    if (!content?.trim() && (!image || image.size === 0)) {
      alert("Musisz dodać treść lub zdjęcie!");
      return;
    }

    noteMutation.mutate(formData);
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
            <div className="form-control">
              <label className="label">
                <span className="label-text flex gap-2 font-semibold">
                  <Layers size={16}/> Kierunek studiów
                </span>
              </label>

              <div className="flex gap-2">
                <select
                  className="select select-bordered w-full flex-1"
                  onChange={e => {
                    setSelectedField(e.target.value);
                    setShowAddField(false);
                    setSelectedSubject('');
                  }}
                  value={selectedField}
                  disabled={showAddField}
                  required={!showAddField}
                >
                  <option value="" disabled>-- Wybierz kierunek --</option>
                  {fields?.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.degree_level})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={`btn btn-square ${showAddField ? 'btn-error' : 'btn-success'}`}
                  onClick={() => {
                    setShowAddField(!showAddField);
                    setShowAddSubject(false);
                    if (!showAddField) {
                      setSelectedField('');
                      setSelectedSubject('');
                    }
                  }}
                >
                  {showAddField ? <Minus size={20}/> : <Plus size={20}/>}
                </button>
              </div>

              {showAddField && (
                <div className="mt-4 p-4 border border-primary/20 rounded-lg bg-base-200">
                  <h4 className="font-semibold mb-2">Dodaj nowy kierunek</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nazwa nowego kierunku..."
                      className="input input-bordered flex-1"
                      value={newFieldName}
                      onChange={e => setNewFieldName(e.target.value)}
                      required
                    />
                    <select
                      className="select select-bordered"
                      defaultValue="I stopnia"
                    >
                      <option value="I stopnia">I stopnia</option>
                      <option value="Magisterskie">Magisterskie</option>
                      <option value="Jednolite magisterskie">Jednolite magisterskie</option>
                    </select>
                  </div>
                  <div className="text-sm opacity-70 mt-2">
                    Po dodaniu kierunek będzie wymagał zatwierdzenia przez administratora
                  </div>
                </div>
              )}
            </div>

            {selectedField && !showAddField && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex gap-2 font-semibold">
                    <BookOpen size={16}/> Przedmiot
                  </span>
                </label>

                <div className="flex gap-2">
                  <select
                    name="subject_id"
                    className="select select-bordered w-full flex-1"
                    onChange={e => setSelectedSubject(e.target.value)}
                    value={selectedSubject}
                    disabled={showAddSubject}
                    required={!showAddSubject}
                  >
                    <option value="" disabled>-- Wybierz przedmiot --</option>
                    {subjects?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Sem. {s.semester || '?'})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={`btn btn-square ${showAddSubject ? 'btn-error' : 'btn-success'}`}
                    onClick={() => setShowAddSubject(!showAddSubject)}
                  >
                    {showAddSubject ? <Minus size={20}/> : <Plus size={20}/>}
                  </button>
                </div>

                {showAddSubject && (
                  <div className="mt-4 p-4 border border-secondary/20 rounded-lg bg-base-200">
                    <h4 className="font-semibold mb-2">Dodaj nowy przedmiot</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nazwa przedmiotu..."
                        className="input input-bordered"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Semestr"
                        min="1" max="10"
                        className="input input-bordered"
                        value={newSubjectSemester}
                        onChange={e => setNewSubjectSemester(parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div className="text-sm opacity-70 mt-2">
                      Po dodaniu przedmiot będzie wymagał zatwierdzenia przez administratora
                    </div>
                  </div>
                )}
              </div>
            )}

            {(showAddField || showAddSubject) && (
              <div className="alert alert-info">
                <div>
                  <span className="font-bold">Uwaga:</span> Po dodaniu nowego kierunku/przedmiotu
                  będziesz mógł dodać notatkę dopiero po zatwierdzeniu przez administratora.
                </div>
              </div>
            )}

            {selectedField && selectedSubject && !showAddField && !showAddSubject && (
              <>
                <input
                  name="title"
                  placeholder="Tytuł (opcjonalnie)"
                  className="input input-bordered w-full font-bold"
                />

                <textarea
                  name="content"
                  placeholder="Opis (opcjonalnie) - możesz dodać tekst lub przesłać zdjęcie poniżej"
                  className="textarea textarea-bordered h-32"
                />

                <div className="divider text-xs uppercase opacity-50">Multimedia</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex gap-2">
                        <LinkIcon size={14}/> Link
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
                    <label className="label">
                      <span className="label-text flex gap-2">
                        <Video size={14}/> Wideo
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

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Zdjęcie/skan (opcjonalnie)</span>
                  </label>
                  <input
                    type="file"
                    name="image"
                    className="file-input file-input-bordered w-full"
                    accept="image/*"
                  />
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      Wymagane: przynajmniej tekst powyżej LUB zdjęcie
                    </span>
                  </label>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-base-200 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Anuluj</button>
          <button
            type="submit"
            form="add-note-form"
            className="btn btn-primary text-white"
            disabled={noteMutation.isPending || createFieldMutation.isPending || createSubjectMutation.isPending}
          >
            {(showAddField || showAddSubject)
              ? (showAddField ? 'Dodaj kierunek' : 'Dodaj przedmiot')
              : (noteMutation.isPending ? 'Wysyłanie...' : 'Wyślij notatkę')
            }
          </button>
        </div>
      </div>
    </div>
  );
}