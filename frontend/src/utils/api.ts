import { jwtDecode } from "jwt-decode";

export const API_URL = 'http://localhost:8000';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface DecodedToken { sub: string; is_admin: boolean; nick: string; exp: number; }

export const isAdmin = () => {
  const t = localStorage.getItem('token');
  if(!t) return false;
  try { return jwtDecode<DecodedToken>(t).is_admin; } catch{ return false; }
};