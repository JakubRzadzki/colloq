import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { University } from '../types';

// API Address
export const API_URL = 'http://localhost:8000';

// Helper to retrieve authorization header
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Types for JWT token
interface DecodedToken {
  sub: string;
  is_admin: boolean;
  nick: string;
  exp: number;
}

// Check if the user is an admin
export const isAdmin = () => {
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    return jwtDecode<DecodedToken>(t).is_admin;
  } catch {
    return false;
  }
};

// --- AUTH ---

export const login = async (username: string, password: string) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  const response = await axios.post(`${API_URL}/token`, formData);
  return response.data;
};

export const register = async (userData: any) => {
  const response = await axios.post(`${API_URL}/register`, {
    user: userData
  });
  return response.data;
};

// --- PUBLIC DATA (GET) ---

export const getUniversities = async (): Promise<University[]> => {
  const response = await axios.get(`${API_URL}/universities`);
  return response.data;
};

// NEW: Get faculties for a university
export const getFaculties = async (universityId: number) => {
  const response = await axios.get(`${API_URL}/universities/${universityId}/faculties`);
  return response.data;
};

// UPDATED: Get fields for a faculty (not university)
export const getFields = async (facultyId: number) => {
  const response = await axios.get(`${API_URL}/faculties/${facultyId}/fields`);
  return response.data;
};

export const getSubjects = async (fieldId: number) => {
  const response = await axios.get(`${API_URL}/fields/${fieldId}/subjects`);
  return response.data;
};

export const getNotes = async (university_id?: number) => {
  const url = university_id
    ? `${API_URL}/notes?university_id=${university_id}`
    : `${API_URL}/notes`;
  const response = await axios.get(url);
  return response.data;
};

// --- COMMUNITY FEATURES (CREATE) ---

// UPDATED: Create university with FormData (for image upload)
export const createUniversity = async (data: {
  name: string;
  city: string;
  region: string;
  image?: File
}) => {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('city', data.city);
  formData.append('region', data.region);

  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await axios.post(`${API_URL}/universities`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// NEW: Create faculty with FormData (for image upload)
export const createFaculty = async (data: {
  name: string;
  description?: string;
  university_id: number;
  image?: File
}) => {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('university_id', data.university_id.toString());

  if (data.description) {
    formData.append('description', data.description);
  }

  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await axios.post(`${API_URL}/faculties`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// UPDATED: Create field of study (now belongs to faculty)
export const createFieldOfStudy = async (fieldData: {
  name: string;
  degree_level: string;
  faculty_id: number  // Changed from university_id
}) => {
  const response = await axios.post(`${API_URL}/fields`, fieldData, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createSubject = async (subjectData: {
  name: string;
  semester: number;
  field_of_study_id: number
}) => {
  const response = await axios.post(`${API_URL}/subjects`, subjectData, {
    headers: getAuthHeader()
  });
  return response.data;
};

// --- ADMIN PANEL ---

export const getPendingItems = async () => {
  const response = await axios.get(`${API_URL}/admin/pending_items`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const approveUniversity = async (universityId: number) => {
  const response = await axios.post(
    `${API_URL}/admin/approve/university/${universityId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

// NEW: Approve faculty
export const approveFaculty = async (facultyId: number) => {
  const response = await axios.post(
    `${API_URL}/admin/approve/faculty/${facultyId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const approveField = async (fieldId: number) => {
  const response = await axios.post(
    `${API_URL}/admin/approve/field/${fieldId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const approveSubject = async (subjectId: number) => {
  const response = await axios.post(
    `${API_URL}/admin/approve/subject/${subjectId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const approveNote = async (noteId: number) => {
  const response = await axios.post(
    `${API_URL}/admin/approve/note/${noteId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

// --- AI CHATBOT ---

export const chatWithAI = async (data: { message: string; note_content?: string }) => {
  const response = await axios.post(`${API_URL}/chat`, data, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
};