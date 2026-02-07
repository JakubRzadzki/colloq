/**
 * One-time feedback prompt for logged-in users: "Jak oceniasz Colloq?" 1–5 + optional comment.
 * Dismissible; after submit or close, we set localStorage so it doesn't show again.
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { submitFeedback } from '../utils/api';

const STORAGE_KEY = 'colloq_feedback_done';

export function FeedbackWidget({ token }: { token: string | null }) {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [token]);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'dismissed');
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    try {
      await submitFeedback(rating, comment.trim() || undefined);
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, 'submitted');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="glass-panel p-5 rounded-2xl shadow-xl border border-white/10">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg">Jak oceniasz Colloq?</h3>
          <button type="button" onClick={handleClose} className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`text-2xl transition-colors ${s <= rating ? 'text-[#f59e0b]' : 'opacity-30 hover:opacity-60'}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Komentarz (opcjonalnie)"
          className="glass-input w-full py-2 px-3 rounded-xl text-sm resize-none h-16 mb-3"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleClose} className="btn btn-ghost text-sm">Później</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating < 1 || submitting}
            className="btn bg-[#5e5ce6] text-white border-none text-sm"
          >
            {submitting ? 'Wysyłanie...' : 'Wyślij'}
          </button>
        </div>
      </div>
    </div>
  );
}
