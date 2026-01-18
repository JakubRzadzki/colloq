import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import {
  University, Faculty, FieldOfStudy, Subject, Note,
  User, Review, Comment, PendingItems
} from './types';

// Re-export types so other components can import them from api.ts
export * from './types';

// Hardcoded API URL for MVP stability
export const API_URL = 'http://localhost:8000';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Synchronous isAdmin check
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

export const logout = () => localStorage.removeItem('token');

// --- AUTH & USER ---
export const login = async (username: string, password: string) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  return (await axios.post(`${API_URL}/token`, formData)).data;
};

export const register = async (userData: any) =>
  (await axios.post(`${API_URL}/register`, { user: userData })).data;

export const getCurrentUser = async (): Promise<User> => {
  const res = await axios.get(`${API_URL}/users/me`, { headers: getAuthHeader() });
  return { ...res.data, username: res.data.nickname };
};

export const updateProfile = async (data: { username?: string; bio?: string; avatar?: File }) => {
  const fd = new FormData();
  if (data.username) fd.append('nickname', data.username);
  if (data.bio) fd.append('bio', data.bio);
  if (data.avatar) fd.append('avatar', data.avatar);
  return await axios.put(`${API_URL}/users/me`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } });
};

// --- DATA FETCHING ---
export const getUniversities = async (): Promise<University[]> => (await axios.get(`${API_URL}/universities`)).data;
export const getUniversity = async (id: number): Promise<University> => (await axios.get(`${API_URL}/universities/${id}`)).data;
export const getFaculties = async (id: number): Promise<Faculty[]> => (await axios.get(`${API_URL}/universities/${id}/faculties`)).data;
export const getFields = async (id: number): Promise<FieldOfStudy[]> => (await axios.get(`${API_URL}/faculties/${id}/fields`)).data;
export const getSubjects = async (id: number): Promise<Subject[]> => (await axios.get(`${API_URL}/fields/${id}/subjects`)).data;

export const getNotes = async (uniId?: number, search?: string): Promise<Note[]> => {
  const params = new URLSearchParams();
  if (uniId) params.append('university_id', uniId.toString());
  if (search) params.append('search', search);
  return (await axios.get(`${API_URL}/notes?${params.toString()}`)).data;
};

// --- CREATION ---
export const createUniversity = async (data: any) => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('city', data.city);
  fd.append('region', data.region);
  if (data.image) fd.append('image', data.image);
  return (await axios.post(`${API_URL}/universities`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } })).data;
};

export const createFaculty = async (fd: FormData) => (await axios.post(`${API_URL}/faculties`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } })).data;
export const createFieldOfStudy = async (data: any) => (await axios.post(`${API_URL}/fields`, data, { headers: getAuthHeader() })).data;
export const createSubject = async (data: any) => (await axios.post(`${API_URL}/subjects`, data, { headers: getAuthHeader() })).data;
export const createNote = async (fd: FormData) => (await axios.post(`${API_URL}/notes`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } })).data;

// --- COMMUNITY ---
export const requestUniversityImageChange = async (uniId: number, file: File) => {
  const fd = new FormData(); fd.append('image', file);
  return (await axios.post(`${API_URL}/universities/${uniId}/image_request`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } })).data;
};

export const voteNote = async (id: number) => (await axios.post(`${API_URL}/notes/${id}/vote`, {}, { headers: getAuthHeader() })).data;
export const toggleFavorite = async (id: number) => (await axios.post(`${API_URL}/notes/${id}/favorite`, {}, { headers: getAuthHeader() })).data;

export const getUniversityReviews = async (id: number): Promise<Review[]> => (await axios.get(`${API_URL}/universities/${id}/reviews`)).data;
export const addReview = async (data: any) => await axios.post(`${API_URL}/reviews`, data, { headers: getAuthHeader() });
export const deleteReview = async (id: number) => await axios.delete(`${API_URL}/reviews/${id}`, { headers: getAuthHeader() });

export const getNoteComments = async (id: number): Promise<Comment[]> => (await axios.get(`${API_URL}/notes/${id}/comments`)).data;
export const addComment = async (id: number, content: string) => await axios.post(`${API_URL}/notes/${id}/comments`, { content }, { headers: getAuthHeader() });

// --- ADMIN ---
export const getPendingItems = async (): Promise<PendingItems> => (await axios.get(`${API_URL}/admin/pending_items`, { headers: getAuthHeader() })).data;
export const approveItem = async (type: string, id: number) => (await axios.post(`${API_URL}/admin/approve/${type}/${id}`, {}, { headers: getAuthHeader() })).data;
export const rejectItem = async (type: string, id: number) => (await axios.delete(`${API_URL}/admin/reject/${type}/${id}`, { headers: getAuthHeader() })).data;
export const approveImageRequest = async (id: number) => (await axios.post(`${API_URL}/admin/approve_image_request/${id}`, {}, { headers: getAuthHeader() })).data;
export const rejectImageRequest = async (id: number) => (await axios.post(`${API_URL}/admin/reject_image_request/${id}`, {}, { headers: getAuthHeader() })).data;
export const updateUniversityImage = async (id: number, file: File) => {
  const fd = new FormData(); fd.append('image', file);
  return (await axios.patch(`${API_URL}/admin/universities/${id}/image`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } })).data;
};
export const updateUniversity = async (id: number, data: any) => {
  const fd = new FormData();
  if (data.description) fd.append('description', data.description);
  if (data.banner) fd.append('banner', data.banner);
  return await axios.put(`${API_URL}/universities/${id}`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } });
};