import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, MessageSquare, Maximize2, Minimize2, ChevronRight, ChevronLeft, Edit, Trash2, Lock, Upload } from 'lucide-react';
import { API_URL, resolveUrl, addComment, getNoteComments, getCurrentUser, voteNote, toggleFavorite, updateNote, deleteNote } from '../utils/api';
import { FilePreview } from './FilePreview';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { t } from '../utils/i18n';

/**
 * Advanced Note Modal Component
 * Features: Drag & Drop, Resize Handle, Maximize, Toggle Comments, Edit/Delete for owner
 * When user is not logged in or has 0 uploads (and not author): content is blurred + overlay CTA.
 */
export function NoteModal({
  note,
  onClose,
  token,
  onUnlockWithUpload,
}: {
  note: import('../utils/types').Note;
  onClose: () => void;
  token: string | null;
  onUnlockWithUpload?: () => void;
}) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const [isMaximized, setIsMaximized] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const [position, setPosition] = useState({ x: 100, y: 50 });
  const [size, setSize] = useState({ w: 900, h: 600 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: !!token,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', note.id],
    queryFn: () => getNoteComments(note.id),
    enabled: !!note && !!token,
  });

  const isBlocked =
    note &&
    (!token ||
      (currentUser &&
        currentUser.uploads_count === 0 &&
        currentUser.id !== note.author?.id &&
        currentUser.id !== note.user_id));

  const isOwner = (): boolean => {
    if (!token || !note.author?.id) return false;
    try {
      const decoded = jwtDecode(token) as { sub?: string; is_admin?: boolean };
      return decoded.sub === String(note.author.id);
    } catch {
      return false;
    }
  };

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(note.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', note.id] });
      setNewComment("");
    }
  });

  const editMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => updateNote(note.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setIsEditing(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteNote(note.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onClose();
    }
  });

  // --- LOGIKA PRZESUWANIA (DRAG) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return; // Nie przesuwaj na pełnym ekranie
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // --- LOGIKA SKALOWANIA (RESIZE) ---
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
  };

  // --- GLOBALNE LISTENERY MYSZY ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing) {
        setSize({
          w: Math.max(400, e.clientX - position.x), // Min width 400
          h: Math.max(300, e.clientY - position.y)  // Min height 300
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position]);

  // Style dynamiczne
  const modalStyle = isMaximized 
    ? { top: 0, left: 0, width: '100vw', height: '100vh', borderRadius: 0 }
    : { top: position.y, left: position.x, width: size.w, height: size.h, borderRadius: '24px' };

  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none">
      {/* WINDOW FRAME */}
      <div 
        className="glass-panel pointer-events-auto flex flex-col overflow-hidden shadow-2xl border border-white/10 bg-[#141419]/90 backdrop-blur-3xl"
        style={{ ...modalStyle, position: 'fixed', transition: isDragging || isResizing ? 'none' : 'all 0.3s ease' }}
      >
        
        {/* HEADER (Draggable Area) */}
        <div 
          className={`h-14 flex items-center justify-between px-6 bg-white/5 border-b border-white/5 select-none ${isMaximized ? '' : 'cursor-move'}`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
             <div className="flex gap-2">
               <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"></button>
               <button onClick={() => setIsMaximized(!isMaximized)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"></button>
               <div className="w-3 h-3 rounded-full bg-green-500"></div>
             </div>
             <span className="text-sm font-bold text-white/50 ml-2">{note.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowComments(!showComments)} 
              className={`btn btn-xs btn-ghost gap-1 ${showComments ? 'text-[#32ade6]' : 'text-white/40'}`}
            >
               {showComments ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
               {showComments ? 'Hide Chat' : 'Show Chat'}
            </button>
            <button onClick={() => setIsMaximized(!isMaximized)} className="btn btn-sm btn-ghost btn-circle text-white/60">
               {isMaximized ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* LEFT: Note Content (blurred when blocked) */}
          <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar transition-all duration-300 relative ${showComments ? 'mr-0' : ''} ${isBlocked ? 'note-content blur' : ''}`}>
             {isBlocked && (
               <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
                 <div className="text-center max-w-sm">
                   <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center shadow-lg">
                     <Lock size={28} className="text-white" />
                   </div>
                   <h3 className="text-xl font-bold mb-2">{t('upload_barrier_title')}</h3>
                   <p className="opacity-90 text-sm mb-4 leading-relaxed">{t('upload_barrier_desc')}</p>
                   {!token ? (
                     <div className="flex flex-col sm:flex-row gap-2 justify-center">
                       <Link to="/login" className="btn btn-primary btn-sm no-underline" onClick={onClose}>
                         {t('login')}
                       </Link>
                       <Link to="/register" className="btn btn-ghost btn-sm border border-white/20 no-underline" onClick={onClose}>
                         {t('register')}
                       </Link>
                     </div>
                   ) : onUnlockWithUpload ? (
                     <button type="button" onClick={onUnlockWithUpload} className="btn btn-primary gap-2">
                       <Upload size={18} /> {t('unlock_with_upload')}
                     </button>
                   ) : (
                     <Link to="/" className="btn btn-primary btn-sm no-underline" onClick={onClose}>
                       {t('unlock_with_upload')}
                     </Link>
                   )}
                 </div>
               </div>
             )}
             {isEditing ? (
               <div className="space-y-6">
                 <div className="space-y-4">
                   <label className="text-sm font-medium text-white/60">Note Title</label>
                   <input 
                     value={editTitle}
                     onChange={(e) => setEditTitle(e.target.value)}
                     className="w-full glass-input text-3xl font-extrabold text-white border-2 border-white/20 focus:border-white/40 transition-all duration-300"
                     placeholder="Enter note title..."
                   />
                 </div>
                 
                 <div className="space-y-4">
                   <label className="text-sm font-medium text-white/60">Note Content</label>
                   <textarea 
                     value={editContent}
                     onChange={(e) => setEditContent(e.target.value)}
                     className="w-full glass-input text-white/90 leading-relaxed min-h-64 border-2 border-white/20 focus:border-white/40 transition-all duration-300 resize-none"
                     placeholder="Write your note content here..."
                   />
                 </div>
                 
                 <div className="flex gap-3 pt-4 border-t border-white/10">
                   <button 
                     onClick={() => editMutation.mutate({ title: editTitle, content: editContent })}
                     disabled={editMutation.isPending}
                     className="btn btn-primary bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] hover:from-[#4a4ad1] hover:to-[#2a96d6] text-white font-bold px-6 py-3 text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {editMutation.isPending ? (
                       <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         <span>Saving...</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <span>💾</span>
                         <span>Save Changes</span>
                       </div>
                     )}
                   </button>
                   
                   <button 
                     onClick={() => {
                       setIsEditing(false);
                       setEditTitle(note.title);
                       setEditContent(note.content);
                     }}
                     className="btn btn-ghost text-white/70 hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40 font-medium px-6 py-3 text-sm transition-all duration-300"
                   >
                     <span>❌</span>
                     <span>Cancel</span>
                   </button>
                 </div>
                 
                 <div className="text-xs text-white/40 bg-white/5 p-3 rounded-lg border border-white/10">
                   <span className="font-medium">💡 Tip:</span> Use Markdown for formatting. Changes are saved automatically when you click Save.
                 </div>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-start mb-8">
                   <div>
                     <h2 className="text-4xl font-extrabold text-white mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                       {note.title}
                     </h2>
                     <div className="flex items-center gap-4 text-sm">
                       <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                         <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#5e5ce6] to-[#32ade6] animate-pulse"></div>
                         <span className="text-white/80 font-medium">by {note.author?.nickname || "Anonymous"}</span>
                       </div>
                       <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/20">
                         <span className="text-white/60 text-xs">📅</span>
                         <span className="text-white/70 font-medium">{note.created_at ? new Date(note.created_at).toLocaleDateString() : "Unknown date"}</span>
                       </div>
                       {note.score && (
                         <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 px-3 py-1 rounded-full border border-yellow-400/30">
                           <span className="text-yellow-300 text-xs">⭐</span>
                           <span className="text-yellow-200 font-medium">{note.score} pts</span>
                         </div>
                       )}
                     </div>
                   </div>
                   {isOwner() && (
                     <div className="flex gap-2">
                       <button 
                         onClick={() => setIsEditing(true)}
                         className="btn btn-sm btn-ghost text-white/60 hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-300 group"
                       >
                         <Edit size={16} className="group-hover:scale-110 transition-transform" />
                         <span className="ml-2 text-sm">Edit</span>
                       </button>
                       <button 
                         onClick={() => deleteMutation.mutate()}
                         className="btn btn-sm btn-ghost text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/30 hover:border-red-400/60 transition-all duration-300 group"
                       >
                         <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                         <span className="ml-2 text-sm">Delete</span>
                       </button>
                     </div>
                   )}
                 </div>
                 
                 {note.image_url && (
                   <img src={resolveUrl(note.image_url)} className="w-full rounded-2xl mb-8 border border-white/10 shadow-lg" alt="Note"/>
                 )}
                 {note.images && note.images.length > 0 && (
                   <div className="space-y-4 mb-8">
                     {note.images.map((img: { id: number; image_url: string }) => (
                       <img key={img.id} src={resolveUrl(img.image_url)} className="w-full rounded-2xl border border-white/10 shadow-lg" alt="Note"/>
                     ))}
                   </div>
                 )}
                 {note.file_url && (
                   <div className="mb-8">
                     <FilePreview 
                       attachment={{
                         id: note.id,
                         file_url: note.file_url,
                         file_type: 'file',
                         is_blurred: !!isBlocked,
                         filename: note.title || 'note',
                       }}
                       title={note.title}
                     />
                   </div>
                 )}
                 <div className="prose prose-invert max-w-none text-white/80 leading-relaxed">
                   {note.content}
                 </div>
               </>
             )}
          </div>

          {/* RIGHT: Comments Sidebar */}
          <div 
            className={`border-l border-white/5 bg-black/20 flex flex-col transition-all duration-300 ease-in-out
              ${showComments ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}
            `}
          >
            <div className="p-4 border-b border-white/5 font-bold text-sm text-white/50 flex items-center gap-2">
              <MessageSquare size={14}/> Dyskusja
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
               {comments?.map((c: import('../utils/types').Comment) => (
                 <div key={c.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                       {/* Avatar użytkownika */}
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.user?.nickname?.[0]?.toUpperCase() || 'U'}
                       </div>
                       <div className="flex-1">
                          <div className="font-bold text-[#32ade6] text-sm">{c.user?.nickname || `User #${c.user_id}`}</div>
                          <div className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString()}</div>
                       </div>
                    </div>
                    <p className="text-sm text-white/90">{c.content}</p>
                 </div>
               ))}
               {comments?.length === 0 && <p className="text-center text-white/30 text-sm py-10">Brak komentarzy.</p>}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/10">
               <input 
                 value={newComment}
                 onChange={e => setNewComment(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && commentMutation.mutate(newComment)}
                 className="glass-input text-sm py-2 px-3 w-full" 
                 placeholder="Napisz komentarz..."
               />
            </div>
          </div>
        </div>

        {/* RESIZE HANDLE (Tylko gdy nie jest maximized) */}
        {!isMaximized && (
          <div 
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-end justify-end p-1"
          >
             <div className="w-2 h-2 border-r-2 border-b-2 border-white/30"></div>
          </div>
        )}

      </div>
    </div>
  );
}
