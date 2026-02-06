import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { University, Faculty, FieldOfStudy, Subject, Note, User, Review, Comment, PendingItems } from './types';

export * from './types';

/**
 * API URL configuration
 * Uses environment variable VITE_API_URL or defaults to localhost
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- HELPER FUNCTIONS ---

/**
 * Get authorization header with Bearer token
 * @returns Object with Authorization header or empty object if no token
 */
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check if current user is admin
 * @returns Boolean indicating admin status
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
 * Logout user by removing token from localStorage
 */
export const logout = () => localStorage.removeItem('token');

// --- AUTHENTICATION ---

/**
 * Login user with username and password
 * Uses URLSearchParams for proper OAuth2 form encoding
 * @param username - User email
 * @param password - User password
 * @returns Login response data
 */
export const login = async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return (await axios.post(`${API_URL}/token`, params)).data;
};

/**
 * Register new user
 * @param userData - User registration data
 * @returns Registration response
 */
export const register = async (userData: any) =>
  (await axios.post(`${API_URL}/register`, { user: userData })).data;

/**
 * Get current user data
 * @returns Current user data with username alias
 */
export const getCurrentUser = async (): Promise<User> => {
  const res = await axios.get(`${API_URL}/users/me`, { headers: getAuthHeader() });
  return { ...res.data, username: res.data.nickname };
};

/**
 * Update user profile including avatar upload
 * @param data - Profile data including optional avatar file
 * @returns Updated user data
 */
export const updateProfile = async (data: any) => {
  const fd = new FormData();
  if (data.username) fd.append('nickname', data.username);
  if (data.bio) fd.append('bio', data.bio);
  if (data.avatar instanceof File) {
    fd.append('avatar', data.avatar);
  }
  // DO NOT set Content-Type manually - browser will set it with boundary
  // This is critical for file uploads to work properly
  return await axios.put(`${API_URL}/users/me`, fd, { headers: { ...getAuthHeader() } });
};

// --- DATA FETCHING ---

/**
 * Get all approved universities
 * @returns Array of universities
 */
export const getUniversities = async (): Promise<University[]> => (await axios.get(`${API_URL}/universities`)).data;

/**
 * Get specific university by ID
 * @param id - University ID
 * @returns University data
 */
export const getUniversity = async (id: number): Promise<University> => (await axios.get(`${API_URL}/universities/${id}`)).data;

/**
 * Get faculties for specific university
 * @param id - University ID
 * @returns Array of faculties
 */
export const getFaculties = async (id: number): Promise<Faculty[]> => (await axios.get(`${API_URL}/universities/${id}/faculties`)).data;

/**
 * Get fields of study for specific faculty
 * @param id - Faculty ID
 * @returns Array of fields of study
 */
export const getFields = async (id: number): Promise<FieldOfStudy[]> => (await axios.get(`${API_URL}/faculties/${id}/fields`)).data;

/**
 * Get subjects for specific field of study
 * @param id - Field of study ID
 * @returns Array of subjects
 */
export const getSubjects = async (id: number): Promise<Subject[]> => (await axios.get(`${API_URL}/fields/${id}/subjects`)).data;

/**
 * Get notes with optional filtering
 * @param uniId - Optional university ID filter
 * @param search - Optional search query
 * @returns Array of notes
 */
export const getNotes = async (uniId?: number, search?: string): Promise<Note[]> => {
  const params = new URLSearchParams();
  if (uniId) params.append('university_id', uniId.toString());
  if (search) params.append('search', search);
  return (await axios.get(`${API_URL}/notes?${params.toString()}`)).data;
};

// --- GLOBAL SEARCH ---

/**
 * Search interface for fields and subjects
 */
export interface SearchResult {
  fields: any[];
  subjects: any[];
}

/**
 * Global search across fields and subjects
 * @param query - Search query string
 * @returns Search results with fields and subjects
 */
export const globalSearch = async (query: string): Promise<SearchResult> => {
  return (await axios.get(`${API_URL}/search/global?q=${encodeURIComponent(query)}`)).data;
};

// --- CREATION & UPLOADS ---

/**
 * Create new university with optional image
 * @param data - University data including optional image
 * @returns Creation response
 */
export const createUniversity = async (data: any) => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('city', data.city);
  fd.append('region', data.region);
  if (data.image) fd.append('image', data.image);
  // DO NOT set Content-Type manually - browser will set it with boundary
  return (await axios.post(`${API_URL}/universities`, fd, { headers: { ...getAuthHeader() } })).data;
};

/**
 * Request university image change
 * @param uniId - University ID
 * @param file - New image file
 * @returns Request response
 */
export const requestUniversityImageChange = async (uniId: number, file: File) => {
  const fd = new FormData(); fd.append('image', file);
  // DO NOT set Content-Type manually - browser will set it with boundary
  return (await axios.post(`${API_URL}/universities/${uniId}/image_request`, fd, { headers: { ...getAuthHeader() } })).data;
};

/**
 * Create new note with optional image
 * @param fd - FormData with note data and optional image
 * @returns Creation response
 */
export const createNote = async (fd: FormData) => {
  // DO NOT set Content-Type manually - browser will set it with boundary
  return (await axios.post(`${API_URL}/notes`, fd, { headers: { ...getAuthHeader() } })).data;
};

/**
 * Create new faculty
 * @param fd - FormData with faculty data
 * @returns Creation response
 */
export const createFaculty = async (fd: FormData) => {
  // DO NOT set Content-Type manually - browser will set it with boundary
  return (await axios.post(`${API_URL}/faculties`, fd, { headers: { ...getAuthHeader() } })).data;
};

/**
 * Create new field of study
 * @param data - Field of study data
 * @returns Creation response
 */
export const createFieldOfStudy = async (data: { name: string, degree_level: string, faculty_id: number }) => 
  (await axios.post(`${API_URL}/fields`, data, { headers: getAuthHeader() })).data;

/**
 * Create new subject
 * @param data - Subject data
 * @returns Creation response
 */
export const createSubject = async (data: { name: string, semester: number, field_of_study_id: number }) => 
  (await axios.post(`${API_URL}/subjects`, data, { headers: getAuthHeader() })).data;

// --- INTERACTIONS ---

/**
 * Vote on note (upvote)
 * @param id - Note ID
 * @returns Vote response
 */
export const voteNote = async (id: number) => (await axios.post(`${API_URL}/notes/${id}/vote`, {}, { headers: getAuthHeader() })).data;

/**
 * Toggle note favorite status
 * @param id - Note ID
 * @returns Favorite toggle response
 */
export const toggleFavorite = async (id: number) => (await axios.post(`${API_URL}/notes/${id}/favorite`, {}, { headers: getAuthHeader() })).data;

/**
 * Get university reviews
 * @param id - University ID
 * @returns Array of reviews
 */
export const getUniversityReviews = async (id: number): Promise<Review[]> => (await axios.get(`${API_URL}/universities/${id}/reviews`)).data;

/**
 * Add review to university
 * @param data - Review data
 * @returns Add review response
 */
export const addReview = async (data: any) => await axios.post(`${API_URL}/reviews`, data, { headers: getAuthHeader() });

/**
 * Get comments for specific note
 * @param id - Note ID
 * @returns Array of comments
 */
export const getNoteComments = async (id: number): Promise<Comment[]> => (await axios.get(`${API_URL}/notes/${id}/comments`)).data;

/**
 * Add comment to note
 * @param id - Note ID
 * @param content - Comment content
 * @returns Add comment response
 */
export const addComment = async (id: number, content: string) => await axios.post(`${API_URL}/notes/${id}/comments`, { content }, { headers: getAuthHeader() });

/**
 * Update note (for owner only)
 * @param id - Note ID
 * @param data - Update data including optional image
 * @returns Update response
 */
export const updateNote = async (id: number, data: any) => {
  const fd = new FormData();
  if (data.title) fd.append('title', data.title);
  if (data.content) fd.append('content', data.content);
  if (data.image instanceof File) {
    fd.append('image', data.image);
  }
  // DO NOT set Content-Type manually - browser will set it with boundary
  return await axios.put(`${API_URL}/notes/${id}`, fd, { headers: { ...getAuthHeader() } });
};

/**
 * Delete note (for owner only)
 * @param id - Note ID
 * @returns Delete response
 */
export const deleteNote = async (id: number) => await axios.delete(`${API_URL}/notes/${id}`, { headers: getAuthHeader() });

// --- ADMIN FUNCTIONS ---

/**
 * Get all pending items for admin approval
 * @returns Pending items including notes, universities, faculties, fields, subjects, and image requests
 */
export const getPendingItems = async (): Promise<PendingItems> => (await axios.get(`${API_URL}/admin/pending_items`, { headers: getAuthHeader() })).data;

/**
 * Approve pending item
 * @param type - Type of item (university, faculty, field, subject, note)
 * @param id - Item ID
 * @returns Approval response
 */
export const approveItem = async (type: string, id: number) => (await axios.post(`${API_URL}/admin/approve/${type}/${id}`, {}, { headers: getAuthHeader() })).data;

/**
 * Reject pending item
 * @param type - Type of item (university, faculty, field, subject, note)
 * @param id - Item ID
 * @returns Rejection response
 */
export const rejectItem = async (type: string, id: number) => (await axios.delete(`${API_URL}/admin/reject/${type}/${id}`, { headers: getAuthHeader() })).data;

/**
 * Approve university image request
 * @param id - Image request ID
 * @returns Approval response
 */
export const approveImageRequest = async (id: number) => (await axios.post(`${API_URL}/admin/approve_image_request/${id}`, {}, { headers: getAuthHeader() })).data;

/**
 * Reject university image request
 * @param id - Image request ID
 * @returns Rejection response
 */
export const rejectImageRequest = async (id: number) => (await axios.post(`${API_URL}/admin/reject_image_request/${id}`, {}, { headers: getAuthHeader() })).data;

/**
 * Update university image (admin only)
 * @param id - University ID
 * @param file - New image file
 * @returns Update response
 */
export const updateUniversityImage = async (id: number, file: File) => {
  const fd = new FormData(); fd.append('image', file);
  // DO NOT set Content-Type manually - browser will set it with boundary
  return (await axios.patch(`${API_URL}/admin/universities/${id}/image`, fd, { headers: { ...getAuthHeader() } })).data;
};

/**
 * Update university details (admin only)
 * @param id - University ID
 * @param data - Update data including optional description and banner
 * @returns Update response
 */
export const updateUniversity = async (id: number, data: any) => {
  const fd = new FormData();
  if (data.description) fd.append('description', data.description);
  if (data.banner) fd.append('banner', data.banner);
  // DO NOT set Content-Type manually - browser will set it with boundary
  return await axios.put(`${API_URL}/universities/${id}`, fd, { headers: { ...getAuthHeader() } });
};

export const getStats = async (): Promise<{
  users_count: number;
  notes_count: number;
  universities_count: number;
  latest_activity: {
    latest_note: {
      id: number;
      title: string;
      created_at: string;
      university_id: number;
    } | null;
    latest_user: {
      id: number;
      nickname: string;
      created_at: string;
    } | null;
    latest_review: {
      id: number;
      content: string;
      created_at: string;
      university_id: number;
    } | null;
  };
}> => {
  const res = await fetch(`${API_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
};

export const getLeaderboard = async (): Promise<{
  leaderboard: Array<{
    rank: number;
    user_id: number;
    nickname: string;
    avatar_url: string | null;
    notes_count: number;
    total_score: number;
    reviews_count: number;
    comments_count: number;
    total_activity: number;
  }>;
  total_users: number;
}> => {
  const res = await fetch(`${API_URL}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
};
