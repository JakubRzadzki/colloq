// frontend/src/pages/AdminPage.tsx
// Admin panel with glassmorphism design and bug fixes applied

import React, { useState, useEffect } from 'react';
import {
  getPendingContent,
  approveNote,
  rejectNote,
  approveReview,
  rejectReview,
  approveImage,
  rejectImage,
  PendingContent,
} from '../utils/api';

interface AdminPageProps {
  t: (key: string) => string;
}

type TabId = 'notes' | 'reviews' | 'images';

const AdminPage: React.FC<AdminPageProps> = ({ t }) => {
  const [pending, setPending] = useState<PendingContent>({
    notes: [],
    reviews: [],
    image_requests: [],
  });
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingContent();
  }, []);

  const loadPendingContent = async () => {
    try {
      setLoading(true);
      const data = await getPendingContent();
      setPending(data);
    } catch (error) {
      console.error('Failed to load pending content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveNote = async (noteId: number) => {
    try {
      await approveNote(noteId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to approve note:', error);
    }
  };

  const handleRejectNote = async (noteId: number) => {
    try {
      await rejectNote(noteId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to reject note:', error);
    }
  };

  const handleApproveReview = async (reviewId: number) => {
    try {
      await approveReview(reviewId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to approve review:', error);
    }
  };

  const handleRejectReview = async (reviewId: number) => {
    try {
      await rejectReview(reviewId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to reject review:', error);
    }
  };

  const handleApproveImage = async (requestId: number) => {
    try {
      await approveImage(requestId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to approve image:', error);
    }
  };

  const handleRejectImage = async (requestId: number) => {
    try {
      await rejectImage(requestId);
      await loadPendingContent();
    } catch (error) {
      console.error('Failed to reject image:', error);
    }
  };

  // ✅ FIX #1: Use correct key for image_requests
  const items = activeTab === 'notes'
    ? (pending['notes'] || [])
    : activeTab === 'reviews'
    ? (pending['reviews'] || [])
    : (pending['image_requests'] || []);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'notes', label: '📄 Notes', count: pending.notes?.length || 0 },
    { id: 'reviews', label: '⭐ Reviews', count: pending.reviews?.length || 0 },
    { id: 'images', label: '🖼️ Images', count: pending.image_requests?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-300 text-lg">
            Review and moderate pending content
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-2 mb-8 inline-flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-white/20'
                      : 'bg-violet-500/20 text-violet-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-slate-300 text-lg">
              No pending {activeTab} to review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Notes */}
            {activeTab === 'notes' &&
              pending.notes.map((note) => (
                <div
                  key={note.id}
                  className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{note.title}</h3>
                      {note.description && (
                        <p className="text-slate-300 mb-3">{note.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm">
                          {note.course_name}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">
                          Score: {note.score}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm">
                          By: {note.user.username}
                        </span>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${note.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View File
                      </a>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApproveNote(note.id)}
                        className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all duration-200 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectNote(note.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all duration-200 font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Reviews */}
            {activeTab === 'reviews' &&
              pending.reviews.map((review) => (
                <div
                  key={review.id}
                  className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-5 h-5 ${
                                i < review.rating ? 'text-yellow-400' : 'text-slate-600'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-slate-400">({review.rating}/5)</span>
                      </div>
                      <p className="text-slate-200 mb-3">{review.content ?? (review as any).comment}</p>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm">
                        By: {review.user.username}
                      </span>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApproveReview(review.id)}
                        className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all duration-200 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectReview(review.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all duration-200 font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Images */}
            {activeTab === 'images' &&
              pending.image_requests.map((request: any) => (
                <div
                  key={request.id}
                  className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${request.new_image_url ?? (request as any).image_url}`}
                        alt="University"
                        className="w-40 h-40 rounded-xl object-cover border border-white/10"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          University ID: {request.university_id}
                        </h3>
                        <p className="text-slate-300 mb-3">
                          Submitted by user ID: {request.submitted_by_id ?? (request as any).submitted_by}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApproveImage(request.id)}
                        className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all duration-200 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleRejectImage(request.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all duration-200 font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
