/**
 * Colloq API Client
 * Centralized API functions for the student note-sharing platform.
 *
 * Features:
 * - Global Axios interceptor for 401/403/500 error handling
 * - Proper FormData handling for multi-file uploads (no manual Content-Type)
 * - Token management with auto-cleanup on expiry
 * - Rich Notes: multi-image upload support
 */
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  University,
  Faculty,
  FieldOfStudy,
  Subject,
  Note,
  NoteImage,
  User,
  Review,
  Comment,
  PendingItems,
} from './types';

export * from './types';

export interface NoteHistoryEntry {
  id: number;
  note_id: number;
  title: string | null;
  content: string | null;
  edited_at: string;
  edited_by: number | null;
}

/**
 * API base URL - uses environment variable or defaults to localhost.
 */
export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a configured Axios instance with interceptors.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Global response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (status === 401) {
      // Token expired or invalid - clean up and let the app handle redirect
      localStorage.removeItem('token');
      console.warn('[API] Session expired. Token removed.');
    } else if (status === 403) {
      console.warn('[API] Forbidden:', detail || 'Access denied');
    } else if (status >= 500) {
      console.error('[API] Server error:', status, detail || 'Internal server error');
    }

    return Promise.reject(error);
  }
);

// Request interceptor to automatically attach auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Resolve an image/asset URL.
 * If the URL is already absolute (http/https/data:), return as-is.
 * If it's a relative path (e.g. /uploads/...), prepend API_URL.
 * Returns a fallback placeholder when url is null/undefined.
 */
export const resolveUrl = (url?: string | null, fallback?: string): string => {
  if (!url) return fallback || 'https://placehold.co/400x200/5e5ce6/ffffff?text=Colloq';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url}`;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get authorization header with Bearer token.
 */
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check if current user is admin by decoding JWT token.
 */
export const isAdmin = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const decoded: any = jwtDecode(token);
    return decoded.is_admin === true;
  } catch {
    return false;
  }
};

/**
 * Logout user by removing token from localStorage.
 */
export const logout = () => localStorage.removeItem('token');

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Login user with email and password.
 * Uses URLSearchParams for proper OAuth2 form encoding.
 */
export const login = async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return (await api.post('/token', params)).data;
};

/**
 * Register a new user account.
 */
export const register = async (userData: any) =>
  (await api.post('/register', { user: userData })).data;

/**
 * Get current authenticated user data.
 * The interceptor handles 401 cleanup automatically.
 */
export const getCurrentUser = async (): Promise<User> => {
  const res = await api.get('/users/me');
  return { ...res.data, username: res.data.nickname };
};

/**
 * Update user profile including avatar upload.
 * Uses FormData - does NOT set Content-Type manually (browser handles boundary).
 */
export const updateProfile = async (data: any) => {
  const fd = new FormData();
  if (data.username) fd.append('nickname', data.username);
  if (data.bio !== undefined) fd.append('bio', data.bio);
  if (data.avatar instanceof File) {
    fd.append('avatar', data.avatar);
  }
  return await api.put('/users/me', fd);
};

// =============================================================================
// DATA FETCHING
// =============================================================================

/** Get all approved universities. Optional region filter (case-insensitive). */
export const getUniversities = async (region?: string): Promise<University[]> => {
  const params = region ? `?region=${encodeURIComponent(region)}` : '';
  return (await api.get(`/universities${params}`)).data;
};

/** Single batched payload for home page. */
export const getHome = async (): Promise<{
  stats: {
    users_count: number;
    notes_count: number;
    universities_count: number;
    latest_activity: Record<string, unknown>;
  };
  leaderboard: { leaderboard: Array<Record<string, unknown>>; total_users: number };
  activity_feed: Array<Record<string, unknown>>;
  recent_notes: Note[];
  universities: University[];
}> => (await api.get('/home')).data;

/** Get specific university by ID. */
export const getUniversity = async (id: number): Promise<University> =>
  (await api.get(`/universities/${id}`)).data;

/** Get faculties for a specific university. */
export const getFaculties = async (id: number): Promise<Faculty[]> =>
  (await api.get(`/universities/${id}/faculties`)).data;

/** Get fields of study for a specific faculty. */
export const getFields = async (id: number): Promise<FieldOfStudy[]> =>
  (await api.get(`/faculties/${id}/fields`)).data;

/** Get subjects for a specific field of study. */
export const getSubjects = async (id: number): Promise<Subject[]> =>
  (await api.get(`/fields/${id}/subjects`)).data;

/** Get notes with optional filtering (university, subject, semester, tags, date range, search, sort). */
export const getNotes = async (params: {
  university_id?: number;
  subject_id?: number;
  semester?: number;
  tag_ids?: number[];
  date_from?: string;
  date_to?: string;
  search?: string;
  sort?: 'date' | 'score' | 'views';
} = {}): Promise<Note[]> => {
  const q = new URLSearchParams();
  if (params.university_id != null) q.append('university_id', params.university_id.toString());
  if (params.subject_id != null) q.append('subject_id', params.subject_id.toString());
  if (params.semester != null) q.append('semester', params.semester.toString());
  if (params.tag_ids?.length) q.append('tag_ids', params.tag_ids.join(','));
  if (params.date_from) q.append('date_from', params.date_from);
  if (params.date_to) q.append('date_to', params.date_to);
  if (params.search) q.append('search', params.search);
  if (params.sort) q.append('sort', params.sort);
  return (await api.get(`/notes?${q.toString()}`)).data;
};

/** Get current user's favorite notes. */
export const getMyFavorites = async (): Promise<Note[]> =>
  (await api.get('/users/me/favorites')).data;

/** Get a single note by ID. */
export const getNote = async (id: number): Promise<Note> =>
  (await api.get(`/notes/${id}`)).data;

// =============================================================================
// GLOBAL SEARCH
// =============================================================================

export interface SearchResult {
  fields: any[];
  subjects: any[];
}

/** Global search across fields and subjects. */
export const globalSearch = async (query: string): Promise<SearchResult> =>
  (await api.get(`/search/global?q=${encodeURIComponent(query)}`)).data;

// =============================================================================
// CREATION & UPLOADS (FormData - no manual Content-Type!)
// =============================================================================

/**
 * Create a new university with optional image.
 */
export const createUniversity = async (data: any) => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('city', data.city);
  fd.append('region', data.region || '');
  fd.append('country', data.country ?? 'Poland');
  if (data.description) fd.append('description', data.description);
  if (data.image instanceof File) fd.append('image', data.image);
  return (await api.post('/universities', fd)).data;
};

/** Request university image change. */
export const requestUniversityImageChange = async (
  uniId: number,
  file: File
) => {
  const fd = new FormData();
  fd.append('image', file);
  return (await api.post(`/universities/${uniId}/image_request`, fd)).data;
};

/**
 * Create a new note with file upload.
 * Supports both legacy single-image and Rich Notes multi-image.
 * Accepts raw FormData - caller is responsible for appending fields.
 */
export const createNote = async (fd: FormData) =>
  (await api.post('/notes', fd)).data;

/** Create a new faculty. */
export const createFaculty = async (fd: FormData) =>
  (await api.post('/faculties', fd)).data;

/** Create a new field of study. */
export const createFieldOfStudy = async (data: {
  name: string;
  degree_level: string;
  faculty_id: number;
}) => (await api.post('/fields', data)).data;

/** Create a new subject. */
export const createSubject = async (data: {
  name: string;
  semester: number;
  field_of_study_id: number;
}) => (await api.post('/subjects', data)).data;

// =============================================================================
// INTERACTIONS
// =============================================================================

/** Upvote a note. */
export const voteNote = async (id: number) =>
  (await api.post(`/notes/${id}/vote`)).data;

/** Toggle favorite status for a note. Returns { is_favorited: boolean }. */
export const toggleFavorite = async (id: number): Promise<{ is_favorited: boolean }> =>
  (await api.post(`/notes/${id}/favorite`)).data;

/** Get university reviews. */
export const getUniversityReviews = async (id: number): Promise<Review[]> =>
  (await api.get(`/universities/${id}/reviews`)).data;

/** Add a review to a university or note. */
export const addReview = async (data: any) =>
  await api.post('/reviews', data);

/** Get comments for a note. */
export const getNoteComments = async (id: number): Promise<Comment[]> =>
  (await api.get(`/notes/${id}/comments`)).data;

/** Add a comment to a note. */
export const addComment = async (id: number, content: string) =>
  await api.post(`/notes/${id}/comments`, { content });

/**
 * Update a note (owner only).
 * Supports adding new images via the 'images' field.
 */
export const updateNote = async (id: number, data: any): Promise<Note> => {
  const fd = new FormData();
  if (data.title !== undefined) fd.append('title', data.title);
  if (data.content !== undefined) fd.append('content', data.content);
  if (data.image instanceof File) {
    fd.append('image', data.image);
  }
  // Support multiple new images
  if (data.images && Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img instanceof File) {
        fd.append('images', img);
      }
    }
  }
  const res = await api.put(`/notes/${id}`, fd);
  return res.data;
};

/** Get note version history (owner or admin only). */
export const getNoteHistory = async (id: number): Promise<NoteHistoryEntry[]> =>
  (await api.get(`/notes/${id}/history`)).data;

/** Delete a note (owner only). */
export const deleteNote = async (id: number) =>
  await api.delete(`/notes/${id}`);

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  message: string;
  related_id: number | null;
  read_at: string | null;
  created_at: string | null;
}

export const getNotifications = async (unreadOnly = false): Promise<NotificationItem[]> =>
  (await api.get(`/notifications?unread_only=${unreadOnly}`)).data;

export const markNotificationRead = async (id: number) =>
  (await api.patch(`/notifications/${id}/read`)).data;

export const markAllNotificationsRead = async () =>
  (await api.patch('/notifications/read-all')).data;

// =============================================================================
// REPORTS
// =============================================================================

export const createReport = async (data: {
  note_id?: number;
  reported_user_id?: number;
  reason: string;
}) => (await api.post('/reports', data)).data;

// =============================================================================
// TAGS
// =============================================================================

export interface TagItem {
  id: number;
  name: string;
}

export const getTags = async (): Promise<TagItem[]> =>
  (await api.get('/tags')).data;

export const createTag = async (name: string) =>
  (await api.post('/tags', { name })).data;

export const setNoteTags = async (noteId: number, tagIds: number[]) =>
  (await api.put(`/notes/${noteId}/tags`, { tag_ids: tagIds })).data;

// =============================================================================
// FEEDBACK
// =============================================================================

export const submitFeedback = async (rating: number, comment?: string) =>
  (await api.post('/feedback', { rating, comment })).data;

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/** Get all pending items for admin approval. */
export const getPendingItems = async (): Promise<PendingItems> =>
  (await api.get('/admin/pending_items')).data;

/** Get all users (admin only). */
export const getAllUsers = async (): Promise<User[]> =>
  (await api.get('/admin/users')).data;

/** Ban or unban user (admin only). */
export const banUser = async (userId: number, banned: boolean) =>
  (await api.patch(`/admin/users/${userId}/ban`, { banned })).data;

/** Approve a pending item. */
export const approveItem = async (type: string, id: number) =>
  (await api.post(`/admin/approve/${type}/${id}`)).data;

/** Reject a pending item. */
export const rejectItem = async (type: string, id: number) =>
  (await api.delete(`/admin/reject/${type}/${id}`)).data;

/** Approve university image request. */
export const approveImageRequest = async (id: number) =>
  (await api.post(`/admin/approve_image_request/${id}`)).data;

/** Reject university image request. */
export const rejectImageRequest = async (id: number) =>
  (await api.post(`/admin/reject_image_request/${id}`)).data;

/** Directly update university image (admin only). */
export const updateUniversityImage = async (id: number, file: File) => {
  const fd = new FormData();
  fd.append('image', file);
  return (await api.patch(`/admin/universities/${id}/image`, fd)).data;
};

/** List reports (admin only). */
export const getReports = async (status?: string): Promise<any[]> => {
  const q = status ? `?status_filter=${status}` : '';
  return (await api.get(`/admin/reports${q}`)).data;
};

/** Update report status (admin only). */
export const updateReportStatus = async (reportId: number, status: 'resolved' | 'dismissed') =>
  (await api.patch(`/admin/reports/${reportId}?status=${status}`)).data;

/** List feedback (admin only). */
export const getFeedback = async (): Promise<any[]> =>
  (await api.get('/admin/feedback')).data;

/** Update university details (admin only). */
export const updateUniversity = async (id: number, data: any) => {
  const fd = new FormData();
  if (data.description) fd.append('description', data.description);
  if (data.banner) fd.append('banner', data.banner);
  return await api.put(`/universities/${id}`, fd);
};

// =============================================================================
// STATISTICS & GAMIFICATION
// =============================================================================

/** Platform-wide statistics. */
export const getStats = async (): Promise<{
  users: number;
  notes: number;
  universities: number;
  users_count: number;
  notes_count: number;
  universities_count: number;
  latest_activity: {
    latest_note: { id: number; title: string; created_at: string; university_id: number } | null;
    latest_user: { id: number; nickname: string; created_at: string } | null;
    latest_review: { id: number; content: string; created_at: string; university_id: number } | null;
  };
}> => (await api.get('/stats')).data;

/** Leaderboard - top 5 users by reputation. */
export const getLeaderboard = async (): Promise<{
  leaderboard: Array<{
    rank: number;
    user_id: number;
    nickname: string;
    avatar_url: string | null;
    reputation_points: number;
    uploads_count: number;
    notes_count: number;
    total_score: number;
    reviews_count: number;
    comments_count: number;
    total_activity: number;
  }>;
  total_users: number;
}> => (await api.get('/leaderboard')).data;

/** Activity feed - last 5 activities. */
export const getActivityFeed = async (): Promise<
  Array<{
    type: string;
    title?: string;
    description?: string;
    rating?: number;
    comment?: string;
    created_at: string;
    user_nickname: string;
    note_title?: string;
  }>
> => (await api.get('/activity-feed')).data;
