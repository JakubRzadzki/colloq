import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send } from 'lucide-react';
import { getNoteComments, addComment, Comment, API_URL } from '../utils/api';

interface NoteModalProps { note: any; onClose: () => void; }

export const NoteModal: React.FC<NoteModalProps> = ({ note, onClose }) => {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ['comments', note.id],
    queryFn: () => getNoteComments(note.id),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(note.id, content),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', note.id] }); setNewComment(''); }
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-5xl h-[90vh] p-0 flex flex-col md:flex-row bg-base-100 overflow-hidden">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-50"><X/></button>

        <div className="w-full md:w-2/3 h-full overflow-y-auto p-8 border-r">
          <h2 className="text-3xl font-bold mb-4">{note.title}</h2>
          {note.image_url && <img src={`${API_URL}${note.image_url}`} className="w-full rounded-xl mb-6 shadow-sm"/>}
          <p className="whitespace-pre-wrap text-lg">{note.content}</p>
        </div>

        <div className="w-full md:w-1/3 h-full flex flex-col bg-base-200/50">
          <div className="p-4 border-b font-bold">Comments</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments?.map((c) => (
              <div key={c.id} className="chat chat-start">
                <div className="chat-header text-xs opacity-50 mb-1">{c.user.username}</div>
                <div className="chat-bubble chat-bubble-secondary text-sm">{c.content}</div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if(newComment.trim()) commentMutation.mutate(newComment); }} className="p-4 border-t flex gap-2">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} className="input input-bordered w-full input-sm" placeholder="Write a comment..." />
            <button className="btn btn-primary btn-sm btn-square"><Send size={16}/></button>
          </form>
        </div>
      </div>
    </div>
  );
};