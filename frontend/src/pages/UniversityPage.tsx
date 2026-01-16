import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  Upload,
  ArrowLeft,
  CheckCircle,
  User as UserIcon,
  Video,
  Link as LinkIcon,
  BookOpen,
  Calendar,
  Award,
  Image as ImageIcon,
  Building2,
  Plus,
  Layers
} from 'lucide-react';
import { API_URL, getFaculties } from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { AddFacultyModal } from '../components/AddFacultyModal';

interface Props {
  token?: string | null;
  t?: any;
  lang?: string;
}

export function UniversityPage({ t, lang }: Props) {
  // 1. Bezpieczne pobieranie ID uczelni z URL
  const params = useParams();
  // Sprawdzamy czy router używa nazwy :id czy :uniId, i konwertujemy na liczbę
  const rawId = params.id || params.uniId;
  const uniId = Number(rawId);
  const isValidId = !isNaN(uniId) && uniId > 0;

  const token = localStorage.getItem('token');

  // Modal states
  const [isNoteModalOpen, setNoteModalOpen] = useState(false);
  const [isFacModalOpen, setFacModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  // 2. Fetch Universities (dla nagłówka - to zapytanie jest bezpieczne zawsze)
  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  // 3. Fetch Faculties (zabezpieczone 'enabled')
  const { data: faculties, isLoading: isFacultiesLoading } = useQuery({
    queryKey: ['faculties', uniId],
    queryFn: () => getFaculties(uniId),
    enabled: isValidId // FIX: Zapytanie poleci tylko gdy mamy poprawne ID
  });

  // 4. Fetch Notes (zabezpieczone 'enabled')
  const { data: notes, isLoading: isNotesLoading } = useQuery({
    queryKey: ['notes', uniId],
    queryFn: async () => axios.get(`${API_URL}/notes?university_id=${uniId}`).then(r => r.data),
    enabled: isValidId // FIX: Zapytanie poleci tylko gdy mamy poprawne ID
  });

  const currentUni = unis?.find((u: any) => u.id === uniId);

  // Helper do tłumaczeń
  const tr = (key: string, fallback: string) => t?.[key] || fallback;

  // Jeśli ID jest nieprawidłowe lub uczelnia nie znaleziona (a lista uczelni już pobrana)
  if (!isValidId || (unis && !currentUni)) {
    if (!unis) {
        // Jeszcze ładujemy listę uczelni
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold opacity-50">Uczelnia nie znaleziona</h2>
        <Link to="/" className="btn btn-primary">Wróć na stronę główną</Link>
      </div>
    );
  }

  // Jeśli uczelnia się ładuje (mamy ID, ale nie mamy jeszcze listy 'unis')
  if (!currentUni) {
     return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
     );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 min-h-screen pb-20">

      {/* --- HEADER UCZELNI --- */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-300 overflow-hidden shadow-sm rounded-none md:rounded-3xl mt-0 md:mt-4">
        <div className="card-body p-6 md:p-8">
          <Link
            to={`/region/${currentUni.region}`}
            className="btn btn-ghost btn-sm gap-2 mb-4 self-start opacity-70 hover:opacity-100 pl-0"
          >
            <ArrowLeft size={16} />
            {tr('backToRegion', 'Wróć do regionu')}
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="avatar">
              <div className="w-24 h-24 rounded-2xl ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-100 p-1 shadow-md">
                {currentUni.image_url ? (
                  <img
                    src={currentUni.image_url.startsWith('http') ? currentUni.image_url : `${API_URL}${currentUni.image_url}`}
                    alt={currentUni.name}
                    className="object-contain rounded-xl w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-base-200 rounded-xl">
                    <Building2 size={32} className="opacity-20" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-base-content">
                {lang === 'pl' ? (currentUni.name_pl || currentUni.name) : (currentUni.name_en || currentUni.name)}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="badge badge-lg gap-2 bg-base-100 shadow-sm border-base-200">
                  <BookOpen size={14} />
                  {currentUni.city}
                </div>
                <div className="badge badge-lg badge-primary gap-2 shadow-sm">
                  {currentUni.region}
                </div>
                <div className="badge badge-lg badge-outline border-primary/30 text-primary">
                  {notes?.length || 0} {tr('materials', 'materiałów')}
                </div>
              </div>
            </div>

            {/* AKCJE */}
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0 w-full md:w-auto">
                {token ? (
                  <>
                    <button
                      onClick={() => setFacModalOpen(true)}
                      className="btn btn-outline gap-2 bg-base-100/50 flex-1 md:flex-none"
                    >
                      <Layers size={18} />
                      {lang === 'pl' ? 'Dodaj Wydział' : 'Add Faculty'}
                    </button>

                    <button
                      onClick={() => setNoteModalOpen(true)}
                      className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all text-white flex-1 md:flex-none"
                    >
                      <Upload size={18} />
                      {tr('uploadMaterials', 'Dodaj notatkę')}
                    </button>
                  </>
                ) : (
                  <div className="tooltip tooltip-bottom w-full md:w-auto" data-tip="Zaloguj się, aby edytować">
                    <button className="btn btn-disabled w-full md:w-auto opacity-70">
                       Zaloguj się, aby dodać
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* --- WYDZIAŁY --- */}
      <div className="space-y-4 px-4 md:px-0">
        <div className="flex items-center gap-2 border-b border-base-200 pb-2">
          <Layers className="text-primary" size={24} />
          <h2 className="text-2xl font-bold">
            {lang === 'pl' ? 'Wydziały' : 'Faculties'}
          </h2>
          <span className="badge badge-ghost">{faculties?.length || 0}</span>
        </div>

        {isFacultiesLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[1,2,3].map(i => <div key={i} className="skeleton h-32 w-full rounded-xl"></div>)}
           </div>
        ) : faculties?.length === 0 ? (
          <div className="alert bg-base-100 border-2 border-dashed border-base-300 flex flex-col items-center justify-center py-10 gap-4">
             <div className="p-4 bg-base-200 rounded-full">
                <Building2 size={32} className="opacity-30" />
             </div>
             <div className="text-center">
                <h3 className="font-bold text-lg">
                    {lang === 'pl' ? 'Brak wydziałów' : 'No faculties'}
                </h3>
                <p className="opacity-60 text-sm max-w-xs mx-auto mt-1">
                    {lang === 'pl'
                      ? 'Ta uczelnia nie ma jeszcze dodanych wydziałów. Zbuduj strukturę od zera!'
                      : 'No faculties added yet. Build the structure from scratch!'}
                </p>
             </div>
             {token && (
                <button onClick={() => setFacModalOpen(true)} className="btn btn-primary btn-sm">
                   <Plus size={16} /> {lang === 'pl' ? 'Dodaj pierwszy wydział' : 'Add first faculty'}
                </button>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {faculties?.map((fac: any) => (
                <div key={fac.id} className="card bg-base-100 shadow-sm border border-base-200 hover:border-primary transition-all cursor-pointer group hover:-translate-y-1">
                  <div className="card-body p-5 flex flex-row items-center gap-4">
                     {fac.image_url ? (
                        <div className="w-16 h-16 rounded-lg bg-base-200 overflow-hidden shrink-0 border border-base-300">
                           <img
                              src={`${API_URL}${fac.image_url}`}
                              alt={fac.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                           />
                        </div>
                     ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 text-primary">
                           <Layers size={24} />
                        </div>
                     )}
                     <div>
                        <h3 className="font-bold leading-tight group-hover:text-primary transition-colors text-lg">
                           {fac.name}
                        </h3>
                        <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                          <CheckCircle size={10} className="text-success"/> {lang === 'pl' ? 'Zatwierdzony' : 'Approved'}
                        </p>
                     </div>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* --- NOTATKI --- */}
      <div className="space-y-4 px-4 md:px-0">
        <div className="flex items-center gap-2 border-b border-base-200 pb-2 mt-8">
          <BookOpen className="text-secondary" size={24} />
          <h2 className="text-2xl font-bold">
            {tr('latestMaterials', 'Najnowsze materiały')}
          </h2>
        </div>

        {isNotesLoading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-dots loading-lg text-primary"></span>
          </div>
        ) : notes?.length === 0 ? (
          <div className="text-center py-16 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
            <Upload size={64} className="mx-auto mb-6 opacity-20" />
            <h3 className="text-2xl font-bold mb-2 opacity-50">
              {tr('noMaterials', 'Brak materiałów')}
            </h3>
            <p className="opacity-50">
              {tr('beFirst', 'Bądź pierwszy i dodaj notatkę!')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {notes?.map((note: any) => (
              <div
                key={note.id}
                className="card bg-base-100 shadow-md hover:shadow-xl transition-all border border-base-200 hover:border-primary group cursor-pointer"
                onClick={() => setSelectedNote(note)}
              >
                <div className="card-body p-6 space-y-4">
                  {/* Nagłówek Notatki */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="card-title text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {note.title || (lang === 'pl' ? 'Bez tytułu' : 'Untitled')}
                      </h3>
                      {note.subject && (
                        <div className="badge badge-primary badge-outline gap-1">
                          <BookOpen size={12} />
                          {note.subject.name}
                        </div>
                      )}
                    </div>
                    <div className="badge badge-lg badge-accent gap-2">
                      <Award size={14} />
                      {note.score || 0}
                    </div>
                  </div>

                  {/* Treść (skrót) */}
                  {note.content && (
                    <p className="text-sm opacity-80 line-clamp-3">{note.content}</p>
                  )}

                  {/* Zdjęcie */}
                  {note.image_url && (
                    <div className="relative h-48 rounded-xl overflow-hidden bg-base-200 border border-base-200 mt-2">
                      <img
                        src={`${API_URL}${note.image_url}`}
                        alt="Note preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 right-2">
                        <div className="badge badge-neutral gap-1 shadow-md bg-black/60 border-none text-white backdrop-blur-md">
                          <ImageIcon size={12} />
                          {tr('image', 'Obraz')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multimedia */}
                  {(note.video_url || note.link_url) && (
                    <div className="flex gap-2 pt-2">
                      {note.video_url && (
                        <span className="badge badge-error badge-outline gap-1 p-3">
                           <Video size={14} /> Wideo
                        </span>
                      )}
                      {note.link_url && (
                        <span className="badge badge-info badge-outline gap-1 p-3">
                           <LinkIcon size={14} /> Link
                        </span>
                      )}
                    </div>
                  )}

                  <div className="divider my-2"></div>

                  {/* Stopka */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-xs font-bold">
                             {(note.author?.nickname || note.author?.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">
                            {note.author?.nickname || note.author?.email?.split('@')[0] || 'Anonim'}
                          </span>
                          {note.author?.is_verified && (
                            <CheckCircle size={14} className="text-blue-500 fill-blue-500/20" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      <Calendar size={12} />
                      {new Date(note.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALE --- */}

      {/* 1. Modal Notatki */}
      {token && (
        <AddNoteModal
          universityId={uniId}
          isOpen={isNoteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          t={t}
          lang={lang || 'pl'}
        />
      )}

      {/* 2. Modal Wydziału */}
      {token && (
        <AddFacultyModal
          isOpen={isFacModalOpen}
          onClose={() => setFacModalOpen(false)}
          universityId={uniId}
          universityName={currentUni.name}
        />
      )}

      {/* 3. Modal Szczegółów Notatki */}
      {selectedNote && (
        <div className="modal modal-open animate-in fade-in duration-200" onClick={() => setSelectedNote(null)}>
          <div className="modal-box max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedNote(null)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>

            <h3 className="font-bold text-2xl mb-4 pr-8">{selectedNote.title || 'Bez tytułu'}</h3>

            {selectedNote.subject && (
              <div className="badge badge-primary mb-4">
                <BookOpen size={12} className="mr-1" />
                {selectedNote.subject.name}
              </div>
            )}

            {selectedNote.content && (
              <div className="prose max-w-none mb-6 bg-base-200/50 p-4 rounded-lg border border-base-200">
                <p className="whitespace-pre-wrap">{selectedNote.content}</p>
              </div>
            )}

            {selectedNote.image_url && (
              <div className="rounded-xl overflow-hidden border border-base-300 mb-4 bg-base-200">
                 <img
                    src={`${API_URL}${selectedNote.image_url}`}
                    alt="Note"
                    className="w-full"
                 />
              </div>
            )}

            <div className="flex gap-2 mb-4">
              {selectedNote.video_url && (
                <a
                  href={selectedNote.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-error btn-outline gap-2"
                >
                  <Video size={16} />
                  {tr('openVideo', 'Otwórz wideo')}
                </a>
              )}
              {selectedNote.link_url && (
                <a
                  href={selectedNote.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-info btn-outline gap-2"
                >
                  <LinkIcon size={16} />
                  {tr('openLink', 'Otwórz link')}
                </a>
              )}
            </div>

            <div className="divider"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                    <UserIcon size={20} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">
                      {selectedNote.author?.nickname || selectedNote.author?.email.split('@')[0]}
                    </span>
                    {selectedNote.author?.is_verified && (
                      <CheckCircle size={14} className="text-blue-500 fill-blue-500/20" />
                    )}
                  </div>
                  <div className="text-xs opacity-70">
                    {new Date(selectedNote.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="badge badge-lg badge-accent gap-2">
                <Award size={16} />
                {selectedNote.score}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}