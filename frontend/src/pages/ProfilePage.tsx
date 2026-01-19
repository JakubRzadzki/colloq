import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateProfile, type User } from '../utils/api';

// FIX: Add t prop
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
      setUsername(user.username);
      setBio(user.bio || '');
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      alert('Profile updated successfully! ✅');
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.detail || 'Failed to update profile'}`);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: any = {};
    if (username !== user?.username) updates.username = username;
    if (bio !== (user?.bio || '')) updates.bio = bio;
    if (avatarFile) updates.avatar = avatarFile;

    if (Object.keys(updates).length === 0) {
      alert('No changes to save');
      return;
    }
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300">
        <span className="loading loading-spinner loading-lg"></span>
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
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{t.profile}</h1>
          <p className="text-base-content/70">Customize your account settings</p>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-xl shadow-2xl">
          <div className="card-body p-8">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-4">
                  <div className="avatar">
                    <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" />
                      ) : (
                        <div className="bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content text-4xl font-bold">
                          {username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm">📷</button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
              </div>

              <div className="form-control mb-6">
                <label className="label"><span className="label-text font-semibold">Username</span></label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input input-bordered input-lg w-full" required />
              </div>

              <div className="form-control mb-6">
                <label className="label"><span className="label-text font-semibold">Bio</span></label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} className="textarea textarea-bordered textarea-lg h-32 w-full" maxLength={500} />
              </div>

              <div className="flex gap-4 justify-end">
                <button type="submit" className="btn btn-primary px-8" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;