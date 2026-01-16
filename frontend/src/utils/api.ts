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

// Helper function to check if user is authenticated (valid token)
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

// Get faculties for a university
export const getFaculties = async (universityId: number) => {
  const response = await axios.get(`${API_URL}/universities/${universityId}/faculties`);
  return response.data;
};

// Get fields for a faculty
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

export const createFaculty = async (formData: FormData) => {
  const response = await axios.post(`${API_URL}/faculties`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const createFieldOfStudy = async (fieldData: {
  name: string;
  degree_level: string;
  faculty_id: number
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

// NEW: Function to update university image
export const updateUniversityImage = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.patch(
    `${API_URL}/admin/universities/${id}/image`,
    formData,
    {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};