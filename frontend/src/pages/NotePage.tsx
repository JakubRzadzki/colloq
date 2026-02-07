/**
 * Note Page Component
 * Displays a single note with the "Upload-to-Unlock" barrier (Growth Engine).
 *
 * Logic:
 * - Fetches the note by ID from the URL params.
 * - Fetches the current user (if logged in).
 * - If user has 0 uploads AND is not the note author:
 *   - The note content is blurred (filter: blur(10px)).
 *   - A non-dismissible glass modal overlay appears with a CTA to upload.
 * - Otherwise, the full note is shown.
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Star, Lock, Upload, FileText, Pencil, Clock } from 'lucide-react';
import { getNote, getCurrentUser, getNoteHistory, API_URL, resolveUrl, type NoteHistoryEntry } from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { EditNoteModal } from '../components/EditNoteModal';
import { t } from '../utils/i18n';

export default function NotePage() {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const noteId = Number(id);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const token = localStorage.getItem('token');

  // Fetch note data
  const {
    data: note,
    isLoading: noteLoading,
    error: noteError,
  } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => getNote(noteId),
    enabled: !!noteId && !isNaN(noteId),
  });

  // Fetch current user data (only if logged in)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: !!token,
  });

  // Fetch note history (only when modal open and user is owner/admin)
  const canEdit = !!note && !!currentUser && (currentUser.id === note.author?.id || currentUser.is_admin);
  const { data: history } = useQuery({
    queryKey: ['noteHistory', noteId],
    queryFn: () => getNoteHistory(noteId),
    enabled: showHistory && !!token && !!noteId && !!canEdit,
  });

  // Upload-to-Unlock barrier logic
  const isBlocked =
    token &&
    currentUser &&
    note &&
    currentUser.uploads_count === 0 &&
    currentUser.id !== note.author?.id;

  if (noteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="loading-spinner w-12 h-12" />
      </div>
    );
  }

  if (noteError || !note) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 gap-4">
        <FileText size={64} className="opacity-20" />
        <h2 className="text-2xl font-bold opacity-60">{t('error')}</h2>
        <p className="opacity-40">{t('something_went_wrong')}</p>
        <Link to="/" className="btn-primary px-6 py-3 rounded-xl mt-4 inline-block no-underline">
          {t('back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity mb-8 no-underline"
        >
          <ArrowLeft size={20} /> {t('back')}
        </Link>

        {/* Note Container - Relative for barrier overlay */}
        <div className="relative">
          {/* Note Content - Blurred if blocked */}
          <div className={isBlocked ? 'note-content blur' : 'note-content'}>
            {/* Note Header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <h1 className="text-4xl font-black flex-1">{note.title || 'Untitled Note'}</h1>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 rounded-xl glass-panel hover:bg-white/15 transition-colors flex items-center gap-2"
                      title={t('edit')}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="p-2 rounded-xl glass-panel hover:bg-white/15 transition-colors flex items-center gap-2"
                      title="History"
                    >
                      <Clock size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm opacity-60">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {note.author?.avatar_url ? (
                      <img
                        src={resolveUrl(note.author.avatar_url)}
                        alt={note.author.nickname}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#5e5ce6] to-[#32ade6] flex items-center justify-center text-white text-xs font-bold">
                        {note.author?.nickname?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <span>
                    {t('by_author')} <strong>{note.author?.nickname || 'Anonymous'}</strong>
                  </span>
                </div>

                {/* Date */}
                <span>
                  {note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}
                </span>

                {/* Score */}
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-[#f59e0b]" />
                  <span>{note.score?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>

            {/* Note Image */}
            {note.image_url && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img
                  src={resolveUrl(note.image_url)}
                  alt={note.title || 'Note'}
                  className="w-full max-h-[500px] object-contain bg-black/5 rounded-xl"
                />
              </div>
            )}

            {/* Note Text Content */}
            {note.content && (
              <div className="prose prose-lg max-w-none mb-8">
                <div className="whitespace-pre-wrap leading-relaxed text-base">
                  {note.content}
                </div>
              </div>
            )}

            {/* Download Button */}
            {note.file_url && (
              <div className="mt-8">
                <a
                  href={resolveUrl(note.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2 no-underline"
                >
                  <Download size={18} /> {t('download')}
                </a>
              </div>
            )}

            {/* Subject Info */}
            {note.subject && (
              <div className="mt-6 p-4 glass-panel rounded-xl">
                <p className="text-sm opacity-60">
                  {t('subjects')}: <strong>{note.subject.name}</strong>
                  {note.subject.semester && (
                    <span>
                      {' '}
                      &bull; {t('semester')} {note.subject.semester}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* History Timeline */}
            {showHistory && (
              <div className="mt-8 p-6 glass-panel rounded-xl border border-white/10">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock size={20} /> {t('version_history')}
                </h3>
                {history && history.length > 0 ? (
                  <ul className="space-y-3">
                    {history.map((h: NoteHistoryEntry) => (
                      <li key={h.id} className="text-sm opacity-80 border-l-2 border-[#5e5ce6]/50 pl-4 py-2">
                        <span className="opacity-60">{t('edited_on')} {new Date(h.edited_at).toLocaleString()}</span>
                        {h.title && <p className="mt-1 font-medium truncate">{h.title}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="opacity-50 text-sm">No edits yet. History will appear here after you edit this note.</p>
                )}
              </div>
            )}
          </div>

          {/* ============================================================
              UPLOAD-TO-UNLOCK BARRIER OVERLAY
              Non-dismissible glass modal shown when user has 0 uploads.
              ============================================================ */}
          {isBlocked && (
            <div className="barrier-overlay">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center shadow-lg">
                  <Lock size={36} className="text-white" />
                </div>

                <h2 className="text-2xl font-black mb-3">{t('upload_barrier_title')}</h2>

                <p className="opacity-70 mb-8 leading-relaxed">{t('upload_barrier_message')}</p>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#5e5ce6]/30 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                >
                  <Upload size={22} /> {t('unlock_with_upload')}
                </button>

                <p className="text-xs opacity-40 mt-6">{t('upload_barrier_desc')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Not logged in prompt */}
        {!token && (
          <div className="mt-8 glass-panel p-8 rounded-xl text-center">
            <p className="opacity-60 mb-4">{t('upload_barrier_desc')}</p>
            <Link
              to="/login"
              className="btn-primary px-6 py-3 rounded-xl inline-block no-underline"
            >
              {t('login')}
            </Link>
          </div>
        )}
      </div>

      {/* Upload Modal - Triggered by barrier CTA */}
      {showUploadModal && note && (
        <AddNoteModal
          universityId={note.university_id}
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Edit Note Modal */}
      {showEditModal && note && (
        <EditNoteModal
          note={note}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['note', noteId] }); }}
        />
      )}
    </div>
  );
}
