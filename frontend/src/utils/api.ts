import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import { University } from '../types';

export const API_URL = 'http://localhost:8000';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface DecodedToken {
  sub: string;
  is_admin: boolean;
  nick: string;
  exp: number;
}

export const isAdmin = () => {
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    return jwtDecode<DecodedToken>(t).is_admin;
  } catch {
    return false;
  }
};

export const getUniversities = async (): Promise<University[]> => {
  const response = await axios.get(`${API_URL}/universities`);
  return response.data;
};

export const getNotes = async (university_id?: number) => {
  const url = university_id
    ? `${API_URL}/notes?university_id=${university_id}`
    : `${API_URL}/notes`;
  const response = await axios.get(url);
  return response.data;
};

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

export const createUniversity = async (universityData: { name: string; city: string; region: string }) => {
  const response = await axios.post(`${API_URL}/universities`, universityData, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createFieldOfStudy = async (fieldData: { name: string; degree_level: string; university_id: number }) => {
  const response = await axios.post(`${API_URL}/fields`, fieldData, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createSubject = async (subjectData: { name: string; semester: number; field_of_study_id: number }) => {
  const response = await axios.post(`${API_URL}/subjects`, subjectData, {
    headers: getAuthHeader()
  });
  return response.data;
};

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