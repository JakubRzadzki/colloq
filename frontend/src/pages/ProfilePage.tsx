/**
 * Profile Page Component
 * Allows users to edit their avatar, bio, and username
 * Modern glassmorphism design with daisyUI
 */

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateProfile, type User } from '../utils/api';

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Initialize form when user data loads
  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || '');
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      alert('Profile updated successfully! ✅');
      // Clear file input
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
      // Create preview
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

    // Only include changed fields
    if (username !== user?.username) {
      updates.username = username;
    }
    if (bio !== (user?.bio || '')) {
      updates.bio = bio;
    }
    if (avatarFile) {
      updates.avatar = avatarFile;
    }

    // Check if anything changed
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Edit Profile</h1>
          <p className="text-base-content/70">Customize your account settings</p>
        </div>

        {/* Profile Card */}
        <div className="card bg-base-100/50 backdrop-blur-xl shadow-2xl">
          <div className="card-body p-8">
            <form onSubmit={handleSubmit}>
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-4">
                  {/* Avatar Display */}
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

                  {/* Change Avatar Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 btn btn-circle btn-primary btn-sm"
                  >
                    📷
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <p className="text-sm text-base-content/50">
                  Click the camera icon to change your avatar
                </p>
              </div>

              {/* Username Field */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Username</span>
                  <span className="label-text-alt text-base-content/50">
                    Must be unique
                  </span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered input-lg w-full"
                  placeholder="Enter username"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>

              {/* Bio Field */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-semibold">Bio</span>
                  <span className="label-text-alt text-base-content/50">
                    {bio.length}/500
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  className="textarea textarea-bordered textarea-lg h-32 w-full"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
                <label className="label">
                  <span className="label-text-alt">
                    Share your interests, field of study, or anything you'd like!
                  </span>
                </label>
              </div>

              {/* Account Info */}
              <div className="divider">Account Information</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="stat bg-base-200/50 rounded-box">
                  <div className="stat-title">Email</div>
                  <div className="stat-value text-lg truncate">{user.email}</div>
                  <div className="stat-desc">Cannot be changed</div>
                </div>

                <div className="stat bg-base-200/50 rounded-box">
                  <div className="stat-title">Member Since</div>
                  <div className="stat-value text-lg">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <div className="stat-desc">
                    {user.is_admin && (
                      <span className="badge badge-primary">Admin</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setUsername(user.username);
                    setBio(user.bio || '');
                    setAvatarFile(null);
                    setAvatarPreview(user.avatar_url || null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="btn btn-ghost"
                  disabled={updateMutation.isPending}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-8"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      💾 Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="card bg-info/10 backdrop-blur-xl shadow-xl mt-6">
          <div className="card-body">
            <h3 className="card-title text-info">
              <span>💡</span>
              Profile Tips
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-base-content/70">
              <li>Choose a professional avatar that represents you</li>
              <li>Write a bio that highlights your academic interests</li>
              <li>Your username will be visible to other users</li>
              <li>Keep your profile information up to date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;