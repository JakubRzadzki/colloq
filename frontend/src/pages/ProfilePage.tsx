import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, AlertCircle, Heart, FileText, PlusCircle } from 'lucide-react';
import { getCurrentUser, updateProfile, resolveUrl, getMyFavorites, type User } from '../utils/api';
import type { Note } from '../utils/types';
import { t } from '../utils/i18n';
import { AddNoteModal } from '../components/addNoteModal';

/**
 * User Profile Page Component
 * Allows users to update their profile information including avatar, username, and bio
 * NOTE: We use the imported `t` function, NOT the prop (which is a Proxy object and not callable).
 */
const ProfilePage: React.FC<{ t: import('../utils/i18n').TFunction }> = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading, error: userError } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: 1,
  });
  const { data: favorites = [] } = useQuery<Note[]>({
    queryKey: ['myFavorites'],
    queryFn: getMyFavorites,
    enabled: !!user,
  });

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [addNoteOpen, setAddNoteOpen] = useState(false);

  React.useEffect(() => {
    if (user) {
      setUsername(user.nickname);
      setBio(user.bio || '');
      setAvatarPreview(user.avatar_url ? resolveUrl(user.avatar_url) : null);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      alert(`${t('profile_updated')} ✅`);
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { detail?: string } } };
      alert(`${t('error')}: ${e.response?.data?.detail || t('something_went_wrong')}`);
    },
  });

  /**
   * Handle avatar file change
   * @param e - File input change event
   */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  /**
   * Handle form submission
   * @param e - Form submit event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { username: string; bio: string; avatar?: File } = { username, bio };
    if (avatarFile) updates.avatar = avatarFile;
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-40 flex justify-center">
        <span className="loading-spinner"></span>
      </div>
    );
  }

  if (!user) {
    const is401 = (userError as { response?: { status?: number } })?.response?.status === 401;
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-4">
        <div className="glass-panel p-8 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400 opacity-70" />
          <h2 className="text-2xl font-bold mb-2">{t('error')}</h2>
          <p className="opacity-60 mb-6">
            {is401
              ? 'Your session has expired. Please log in again.'
              : 'Could not load profile. Make sure the backend is running.'}
          </p>
          {is401 && (
            <a href="/login" className="btn-squircle inline-block px-6 py-3 no-underline">
              {t('login')}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-4 pb-12">
      <div className="max-w-3xl mx-auto glass-panel p-8 md:p-12 relative overflow-hidden">
        
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[#5e5ce6]/20 to-[#32ade6]/20 -z-10"></div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* AVATAR SECTION - FIXED LAYOUT */}
            <div className="relative group shrink-0 mx-auto md:mx-0">
                {/* FIXED: Proper aspect ratio and overflow-hidden to prevent distortion */}
                <div className="aspect-square w-40 h-40 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden bg-black/50">
                    {avatarPreview ? (
                        /* FIXED: object-cover prevents image stretching/distortion */
                        <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                        /* Placeholder */
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] text-white text-5xl font-bold">
                            {user?.nickname?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
                
                {/* Przycisk edycji */}
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="absolute bottom-2 right-2 btn btn-circle bg-[#32ade6] hover:bg-[#2697cc] border-none text-white shadow-lg"
                >
                    <Camera size={18}/>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            {/* FORM SECTION */}
            <form onSubmit={handleSubmit} className="flex-1 w-full space-y-6 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black text-white">{user?.email}</h1>
                    <div className="badge badge-outline opacity-50 text-white">{user?.is_admin ? 'Administrator' : 'Student'}</div>
                    <button type="button" onClick={() => setAddNoteOpen(true)} className="btn btn-sm gap-2 bg-[#5e5ce6] hover:bg-[#4d4ac9] border-none text-white">
                      <PlusCircle size={16} /> Dodaj notatkę
                    </button>
                </div>

                <div className="grid gap-4">
                    <div className="form-control">
                        <label className="label uppercase text-xs font-bold opacity-60 text-white">{t('nickname')}</label>
                        <input 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="glass-input font-bold text-lg" 
                        />
                    </div>
                    <div className="form-control">
                        <label className="label uppercase text-xs font-bold opacity-60 text-white">Bio</label>
                        <textarea 
                            value={bio} 
                            onChange={e => setBio(e.target.value)} 
                            className="glass-input h-32 resize-none" 
                            placeholder="Napisz coś o sobie..." 
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button className="btn-squircle flex items-center gap-2" disabled={updateMutation.isPending}>
                        <Save size={18}/> {updateMutation.isPending ? t('saving') : t('save_changes')}
                    </button>
                </div>
            </form>
        </div>

        {/* My Favorites */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Heart size={22} className="text-[#bf5af2]" /> My Favorites
          </h2>
          {favorites.length === 0 ? (
            <p className="text-white/50 text-sm">No favorite notes yet. Save notes from university pages with the heart icon.</p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((note: Note) => (
                <li key={note.id}>
                  <Link
                    to={`/note/${note.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl glass-panel hover:border-[#5e5ce6]/40 transition-colors no-underline text-white"
                  >
                    <FileText size={18} className="opacity-60 shrink-0" />
                    <span className="font-medium truncate">{note.title || 'Untitled'}</span>
                    {note.subject && <span className="text-xs opacity-50 shrink-0">{note.subject.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AddNoteModal isOpen={addNoteOpen} onClose={() => setAddNoteOpen(false)} />
    </div>
  );
};

export default ProfilePage;
