// frontend/src/utils/api.ts
// Complete version with all bug fixes applied

import axios from 'axios';

// ✅ FIX #3: Use environment variable for API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface User {
  id: number;
  username: string;
  nickname: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

export interface University {
  id: number;
  name: string;
  city?: string;
  region: string;
  image_url?: string;
  banner_url?: string;
  description?: string;
  website?: string;
}

export interface Faculty {
  id: number;
  name: string;
  image_url?: string;
  university_id: number;
}

export interface Note {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  university_id: number;
  course_name: string;
  score: number;
  created_at: string;
  user: User;
  is_approved: boolean;
}

export interface Review {
  id: number;
  university_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: User;
  is_approved: boolean;
}

export interface Comment {
  id: number;
  note_id: number;
  content: string;
  created_at: string;
  user: User;
}

export interface PendingContent {
  notes: Note[];
  reviews: Review[];
  image_requests: any[];
}

// ✅ FIX #2: Add user transformation helper
const transformUser = (user: any): User => ({
  id: user.id,
  username: user.nickname || user.username,
  nickname: user.nickname,
  email: user.email,
  role: user.role,
  avatar_url: user.avatar_url,
  created_at: user.created_at
});

// Auth
export const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const res = await axiosInstance.post('/auth/login', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (res.data.access_token) {
    localStorage.setItem('token', res.data.access_token);
  }

  return res.data;
};

export const register = async (data: { email: string; password: string; nickname?: string; university_id: number }) => {
  const res = await axiosInstance.post('/auth/register', {
    email: data.email,
    password: data.password,
    nickname: data.nickname ?? null,
    university_id: data.university_id,
  });
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

// ✅ FIX #2: Transform user data
export const getCurrentUser = async (): Promise<User> => {
  const res = await axiosInstance.get('/users/me');
  return transformUser(res.data);
};

export const updateProfile = async (data: FormData): Promise<User> => {
  const res = await axiosInstance.patch('/users/me', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return transformUser(res.data);
};

// Universities
export const getUniversities = async (): Promise<University[]> => {
  const res = await axiosInstance.get('/universities');
  return res.data;
};

export const getUniversitiesByRegion = async (region: string): Promise<University[]> => {
  const res = await axiosInstance.get(`/universities/region/${region}`);
  return res.data;
};

export const getUniversity = async (id: number): Promise<University> => {
  const res = await axiosInstance.get(`/universities/${id}`);
  return res.data;
};

export const searchUniversities = async (query: string): Promise<University[]> => {
  const res = await axiosInstance.get(`/universities/search?q=${query}`);
  return res.data;
};

export const uploadUniversityImage = async (universityId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axiosInstance.post(`/universities/${universityId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Notes
export const getNotesByUniversity = async (universityId: number): Promise<Note[]> => {
  const res = await axiosInstance.get(`/universities/${universityId}/notes`);
  return res.data.map((note: any) => ({
    ...note,
    user: transformUser(note.user)
  }));
};

export const searchNotes = async (query: string): Promise<Note[]> => {
  const res = await axiosInstance.get(`/notes/search?q=${query}`);
  return res.data.map((note: any) => ({
    ...note,
    user: transformUser(note.user)
  }));
};

export const uploadNote = async (data: FormData): Promise<Note> => {
  const res = await axiosInstance.post('/notes', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const voteNote = async (noteId: number): Promise<any> => {
  const res = await axiosInstance.post(`/notes/${noteId}/vote`, {});
  return res.data;
};

// ✅ FIX #2: Transform user in comments
export const getNoteComments = async (noteId: number): Promise<Comment[]> => {
  const res = await axiosInstance.get(`/notes/${noteId}/comments`);
  return res.data.map((comment: any) => ({
    ...comment,
    user: transformUser(comment.user)
  }));
};

export const addNoteComment = async (noteId: number, content: string): Promise<Comment> => {
  const res = await axiosInstance.post(`/notes/${noteId}/comments`, { content });
  return {
    ...res.data,
    user: transformUser(res.data.user)
  };
};

// Reviews
// ✅ FIX #2: Transform user in reviews; map content -> comment for frontend
export const getUniversityReviews = async (universityId: number): Promise<Review[]> => {
  const res = await axiosInstance.get(`/universities/${universityId}/reviews`);
  return res.data.map((review: any) => ({
    ...review,
    comment: review.content ?? review.comment,
    user: transformUser(review.user)
  }));
};

export const addUniversityReview = async (
  universityId: number,
  rating: number,
  comment: string
): Promise<Review> => {
  const res = await axiosInstance.post(`/universities/${universityId}/reviews`, {
    rating,
    content: comment, // backend expects "content"
  });
  return {
    ...res.data,
    user: transformUser(res.data.user),
    comment,
  };
};

// Admin
export const getPendingContent = async (): Promise<PendingContent> => {
  const res = await axiosInstance.get('/admin/pending');
  return res.data;
};

export const approveNote = async (noteId: number) => {
  const res = await axiosInstance.post(`/admin/notes/${noteId}/approve`);
  return res.data;
};

export const rejectNote = async (noteId: number) => {
  const res = await axiosInstance.post(`/admin/notes/${noteId}/reject`);
  return res.data;
};

export const approveReview = async (reviewId: number) => {
  const res = await axiosInstance.post(`/admin/reviews/${reviewId}/approve`);
  return res.data;
};

export const rejectReview = async (reviewId: number) => {
  const res = await axiosInstance.post(`/admin/reviews/${reviewId}/reject`);
  return res.data;
};

export const approveImage = async (requestId: number) => {
  const res = await axiosInstance.post(`/admin/images/${requestId}/approve`);
  return res.data;
};

export const rejectImage = async (requestId: number) => {
  const res = await axiosInstance.post(`/admin/images/${requestId}/reject`);
  return res.data;
};

// --- Aliases and extra API for UniversityPage, addNoteModal, etc. ---

export const requestUniversityImageChange = uploadUniversityImage;

export const addComment = addNoteComment;

export const addReview = async (body: { university_id: number; rating: number; content: string }): Promise<Review> =>
  addUniversityReview(body.university_id, body.rating, body.content);

/** Get notes for a university, optionally filtered by search (client-side filter). */
export const getNotes = async (universityId: number, search?: string): Promise<Note[]> => {
  const notes = await getNotesByUniversity(universityId);
  if (!search?.trim()) return notes;
  const q = search.toLowerCase();
  return notes.filter(
    (n) =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.description && n.description.toLowerCase().includes(q)) ||
      (n.course_name && n.course_name.toLowerCase().includes(q))
  );
};

/** Faculties (stub until backend has endpoint). */
export const getFaculties = async (_universityId: number): Promise<Faculty[]> => {
  const res = await axiosInstance.get(`/universities/${_universityId}/faculties`).catch(() => ({ data: [] }));
  return Array.isArray(res.data) ? res.data : [];
};

/** Fields of study (stub until backend has endpoint). */
export const getFields = async (_facultyId: number): Promise<{ id: number; name: string; faculty_id: number }[]> => {
  const res = await axiosInstance.get(`/faculties/${_facultyId}/fields`).catch(() => ({ data: [] }));
  return Array.isArray(res.data) ? res.data : [];
};

/** Subjects (stub until backend has endpoint). */
export const getSubjects = async (_fieldId: number): Promise<{ id: number; name: string; semester?: number; field_of_study_id: number }[]> => {
  const res = await axiosInstance.get(`/fields/${_fieldId}/subjects`).catch(() => ({ data: [] }));
  return Array.isArray(res.data) ? res.data : [];
};

/** Create note from form (maps to uploadNote with course_name/subject). */
export const createNote = async (formData: FormData): Promise<Note> => {
  const title = formData.get('title') as string;
  const content = (formData.get('content') ?? formData.get('description')) as string | undefined;
  const universityId = formData.get('university_id') as string;
  const subjectId = formData.get('subject_id') as string;
  const file = formData.get('image') ?? formData.get('file');
  const fd = new FormData();
  fd.append('title', title ?? '');
  fd.append('description', content ?? '');
  fd.append('course_name', subjectId ? `Subject ${subjectId}` : 'General');
  fd.append('university_id', universityId ?? '');
  if (file instanceof File) fd.append('file', file);
  return uploadNote(fd);
};

export const createFieldOfStudy = async (_payload: { name: string; degree_level: string; faculty_id: number }): Promise<unknown> => {
  const res = await axiosInstance.post('/fields', _payload).catch(() => ({ data: {} }));
  return res.data;
};

export const createSubject = async (_payload: { name: string; semester: number; field_of_study_id: number }): Promise<unknown> => {
  const res = await axiosInstance.post('/subjects', _payload).catch(() => ({ data: {} }));
  return res.data;
};

/** Toggle favorite (stub until backend has endpoint). */
export const toggleFavorite = async (_noteId: number): Promise<{ is_favorited?: boolean }> => {
  await axiosInstance.post(`/notes/${_noteId}/favorite`).catch(() => ({}));
  return {};
};

/** Create university (stub until backend has endpoint). */
export const createUniversity = async (payload: { name: string; city: string; region: string; image?: File }): Promise<University> => {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('city', payload.city);
  formData.append('region', payload.region);
  if (payload.image) formData.append('file', payload.image);
  const res = await axiosInstance.post('/universities', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch(() => ({ data: { id: 0, name: payload.name, region: payload.region, city: payload.city } }));
  return res.data as University;
};

/** Create faculty (stub until backend has endpoint). */
export const createFaculty = async (formData: FormData): Promise<Faculty> => {
  const res = await axiosInstance.post('/faculties', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch(() => ({ data: { id: 0, name: String(formData.get('name')), university_id: Number(formData.get('university_id')) } }));
  return res.data as Faculty;
};

/** Global search (stub until backend has endpoint). */
export const globalSearch = async (_query: string): Promise<{ subjects: any[]; fields: any[] }> => {
  const res = await axiosInstance.get(`/search?q=${encodeURIComponent(_query)}`).catch(() => ({ data: { subjects: [], fields: [] } }));
  return res.data?.subjects != null ? res.data : { subjects: [], fields: [] };
};

export default axiosInstance;