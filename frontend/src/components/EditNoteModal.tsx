/**
 * Edit Note Modal - Edit existing note with glassmorphism styling.
 * Pre-filled with current note data. Saves version to history on backend.
 */
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { updateNote, type Note } from '../utils/api';
import { t } from '../utils/i18n';

interface Props {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditNoteModal({ note, isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
    }
  }, [note]);

  const mutation = useMutation({
    mutationFn: () => updateNote(note.id, { title, content, image: imageFile || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', note.id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || t('something_went_wrong'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg bg-white/10 dark:bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-white">
            {t('edit')} {t('notes')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label text-white/70 uppercase text-xs font-bold">{t('title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full"
              placeholder={t('title')}
            />
          </div>
          <div>
            <label className="label text-white/70 uppercase text-xs font-bold">{t('description')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="glass-input w-full h-32 resize-none rounded-2xl"
              placeholder={t('description')}
            />
          </div>
          <div>
            <label className="label text-white/70 uppercase text-xs font-bold">{t('file')} (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="file-input file-input-bordered w-full glass-input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn-squircle flex items-center gap-2"
              disabled={mutation.isPending}
            >
              <Save size={18} /> {mutation.isPending ? t('saving') : t('save_changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
