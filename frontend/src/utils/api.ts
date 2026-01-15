import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import { University } from '../types';  // Upewnij się, że ścieżka jest poprawna

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

// Dodaj brakujące funkcje API
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

export const register = async (userData: any, captchaToken: string) => {
  const response = await axios.post(`${API_URL}/register`, {
    user: userData,
    captcha_token: captchaToken
  });
  return response.data;
};