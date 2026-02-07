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
import { ArrowLeft, Star, Lock, Upload, FileText, Pencil, Clock, Share2, Flag } from 'lucide-react';
import { getNote, getCurrentUser, getNoteHistory, resolveUrl, createReport, type NoteHistoryEntry } from '../utils/api';
import { AddNoteModal } from '../components/addNoteModal';
import { EditNoteModal } from '../components/EditNoteModal';
import { FilePreview } from '../components/FilePreview';
import { t } from '../utils/i18n';

export default function NotePage() {
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const noteId = Number(id);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
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

  // Blur note when: not logged in, OR (logged in with 0 uploads and not the author)
  const isBlocked =
    note &&
    (!token ||
      (currentUser &&
        currentUser.uploads_count === 0 &&
        currentUser.id !== note.author?.id));

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

                {/* Share & Report (when not editing) */}
                {!canEdit && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className="p-2 rounded-lg glass-panel hover:bg-white/15 transition-colors flex items-center gap-1.5 text-sm"
                      title="Copy link"
                    >
                      <Share2 size={16} /> {linkCopied ? 'Copied!' : 'Share'}
                    </button>
                    {token && (
                      <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="p-2 rounded-lg glass-panel hover:bg-red-500/10 transition-colors flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100"
                        title="Report"
                      >
                        <Flag size={16} /> Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Note Image (legacy single) */}
            {note.image_url && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img
                  src={resolveUrl(note.image_url)}
                  alt={note.title || 'Note'}
                  className="w-full max-h-[500px] object-contain bg-black/5 rounded-xl"
                />
              </div>
            )}

            {/* Note Images (multiple) */}
            {note.images?.length > 0 && (
              <div className="mb-8 space-y-4">
                {note.images.map((img: { id: number; image_url: string; caption?: string }) => (
                  <div key={img.id} className="rounded-xl overflow-hidden">
                    <img
                      src={resolveUrl(img.image_url)}
                      alt={img.caption || note.title || 'Note'}
                      className="w-full max-h-[500px] object-contain bg-black/5 rounded-xl"
                    />
                    {img.caption && (
                      <p className="text-sm opacity-60 mt-2">{img.caption}</p>
                    )}
                  </div>
                ))}
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

            {/* File attachment: preview + download */}
            {note.file_url && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-3">{t('attachment')}</h3>
                <FilePreview fileUrl={note.file_url} title={note.title} className="mb-4" />
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
              BARRIER OVERLAY: not logged in OR 0 uploads → blur + CTA
              Message: "You need to upload at least one note to access other users' notes..."
              ============================================================ */}
          {isBlocked && (
            <div className="barrier-overlay">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center shadow-lg">
                  <Lock size={36} className="text-white" />
                </div>

                <h2 className="text-2xl font-black mb-3">{t('upload_barrier_title')}</h2>

                <p className="opacity-90 mb-6 leading-relaxed text-sm">
                  {t('upload_barrier_desc')}
                </p>

                {!token ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Link
                      to="/login"
                      className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#5e5ce6]/30 hover:scale-105 transition-all flex items-center gap-3 no-underline"
                    >
                      {t('login')}
                    </Link>
                    <Link
                      to="/register"
                      className="glass-panel border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-3 no-underline"
                    >
                      {t('register')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="opacity-70 mb-4 text-sm">{t('upload_barrier_message')}</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="bg-gradient-to-r from-[#5e5ce6] to-[#bf5af2] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#5e5ce6]/30 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                    >
                      <Upload size={22} /> {t('unlock_with_upload')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
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

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowReportModal(false); setReportStatus('idle'); }}>
          <div className="glass-panel p-6 rounded-2xl max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">Report this note</h3>
            {reportStatus === 'ok' && <p className="text-green-400 text-sm mb-3">Report submitted. Thank you.</p>}
            {reportStatus === 'error' && <p className="text-red-400 text-sm mb-3">Failed to submit. Try again.</p>}
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="glass-input w-full py-2 px-3 rounded-xl mb-4" disabled={reportStatus === 'sending'}>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="copyright">Copyright violation</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowReportModal(false); setReportStatus('idle'); }} className="btn btn-ghost">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  setReportStatus('sending');
                  try {
                    await createReport({ note_id: noteId, reason: reportReason });
                    setReportStatus('ok');
                    setTimeout(() => { setShowReportModal(false); setReportStatus('idle'); }, 1500);
                  } catch {
                    setReportStatus('error');
                  }
                }}
                disabled={reportStatus === 'sending'}
                className="btn btn-primary"
              >
                {reportStatus === 'sending' ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
