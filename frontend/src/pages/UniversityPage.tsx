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
  Image as ImageIcon
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';

export function UniversityPage({ token, t, lang }: { token: string | null; t: any; lang: string }) {
  const { uniId } = useParams();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  const { data: unis } = useQuery({
    queryKey: ['unis'],
    queryFn: async () => axios.get(`${API_URL}/universities`).then(r => r.data)
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', uniId],
    queryFn: async () => axios.get(`${API_URL}/notes?university_id=${uniId}`).then(r => r.data)
  });

  const currentUni = unis?.find((u: any) => u.id === Number(uniId));

  if (!currentUni) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* University Header */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-300 overflow-hidden">
        <div className="card-body p-8">
          <Link
            to={`/region/${currentUni.region}`}
            className="btn btn-ghost btn-sm gap-2 mb-4 self-start"
          >
            <ArrowLeft size={16} />
            {lang === 'pl' ? 'Wróć do regionu' : 'Back to region'}
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="avatar">
              <div className="w-24 rounded-2xl ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={currentUni.image_url} alt={currentUni.name} />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">
                {lang === 'pl' ? currentUni.name_pl : currentUni.name_en}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="badge badge-lg gap-2">
                  <BookOpen size={14} />
                  {currentUni.city}
                </div>
                <div className="badge badge-lg badge-primary gap-2">
                  {currentUni.region}
                </div>
                <div className="badge badge-lg badge-outline">
                  {notes?.length || 0} {lang === 'pl' ? 'materiałów' : 'materials'}
                </div>
              </div>
            </div>

            {token && (
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Upload size={18} />
                {t.uploadTitle}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {token && (
        <AddNoteModal
          universityId={Number(uniId)}
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-dots loading-lg text-primary"></span>
        </div>
      ) : notes?.length === 0 ? (
        <div className="text-center py-20 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
          <Upload size={64} className="mx-auto mb-6 opacity-20" />
          <h3 className="text-2xl font-bold mb-2 opacity-50">
            {lang === 'pl' ? 'Brak materiałów' : 'No materials yet'}
          </h3>
          <p className="opacity-50">
            {lang === 'pl' ? 'Bądź pierwszy i dodaj notatkę!' : 'Be the first to add a note!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {notes?.map((note: any) => (
            <div
              key={note.id}
              className="card bg-base-100 shadow-lg hover:shadow-2xl transition-all border border-base-300 hover:border-primary group cursor-pointer"
              onClick={() => setSelectedNote(note)}
            >
              <div className="card-body p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="card-title text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {note.title}
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
                    {note.score}
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-sm opacity-80 line-clamp-3">{note.content}</p>

                {/* Image Preview */}
                {note.image_url && (
                  <div className="relative h-48 rounded-xl overflow-hidden bg-base-200">
                    <img
                      src={`${API_URL}${note.image_url}`}
                      alt="Note preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2">
                      <div className="badge badge-neutral gap-1">
                        <ImageIcon size={12} />
                        {lang === 'pl' ? 'Obraz' : 'Image'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Multimedia Links */}
                {(note.video_url || note.link_url) && (
                  <div className="flex gap-2">
                    {note.video_url && (
                      <a
                        href={note.video_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-sm btn-error btn-outline gap-1"
                      >
                        <Video size={14} />
                        {lang === 'pl' ? 'Wideo' : 'Video'}
                      </a>
                    )}
                    {note.link_url && (
                      <a
                        href={note.link_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-sm btn-info btn-outline gap-1"
                      >
                        <LinkIcon size={14} />
                        Link
                      </a>
                    )}
                  </div>
                )}

                <div className="divider my-2"></div>

                {/* Footer */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-8 h-8">
                        <UserIcon size={16} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">
                          {note.author.nickname || note.author.email.split('@')[0]}
                        </span>
                        {note.author.is_verified && (
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

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="modal modal-open" onClick={() => setSelectedNote(null)}>
          <div className="modal-box max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedNote(null)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>

            <h3 className="font-bold text-2xl mb-4">{selectedNote.title}</h3>

            {selectedNote.subject && (
              <div className="badge badge-primary mb-4">
                <BookOpen size={12} className="mr-1" />
                {selectedNote.subject.name}
              </div>
            )}

            <div className="prose max-w-none mb-6">
              <p className="whitespace-pre-wrap">{selectedNote.content}</p>
            </div>

            {selectedNote.image_url && (
              <img
                src={`${API_URL}${selectedNote.image_url}`}
                alt="Note"
                className="w-full rounded-xl mb-4"
              />
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
                  {lang === 'pl' ? 'Otwórz wideo' : 'Open video'}
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
                  {lang === 'pl' ? 'Otwórz link' : 'Open link'}
                </a>
              )}
            </div>

            <div className="divider"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                    <UserIcon size={20} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">
                      {selectedNote.author.nickname || selectedNote.author.email.split('@')[0]}
                    </span>
                    {selectedNote.author.is_verified && (
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