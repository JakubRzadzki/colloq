import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save } from 'lucide-react';
import { getCurrentUser, updateProfile, API_URL, type User } from '../utils/api';

/**
 * User Profile Page Component
 * Allows users to update their profile information including avatar, username, and bio
 * @param t - Translation object
 */
const ProfilePage: React.FC<{ t: any }> = ({ t }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setUsername(user.nickname);
      setBio(user.bio || '');
      setAvatarPreview(user.avatar_url ? `${API_URL}${user.avatar_url}` : null);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      alert('Zapisano zmiany! ✅');
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      alert(`Błąd: ${error.response?.data?.detail || 'Nie udało się zaktualizować profilu'}`);
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
    const updates: any = { username, bio };
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300">
        <div className="card bg-error/20 backdrop-blur-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-error">Error loading profile</h2>
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
                <div>
                    <h1 className="text-3xl font-black text-white">{user?.email}</h1>
                    <div className="badge badge-outline mt-2 opacity-50 text-white">{user?.is_admin ? 'Administrator' : 'Student'}</div>
                </div>

                <div className="grid gap-4">
                    <div className="form-control">
                        <label className="label uppercase text-xs font-bold opacity-60 text-white">Nazwa Użytkownika</label>
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
                        <Save size={18}/> {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
