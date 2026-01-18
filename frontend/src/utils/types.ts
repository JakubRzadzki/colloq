// Centralized type definitions to avoid "Property does not exist" errors
export interface User {
  id: number;
  email: string;
  username: string; // Mapped from backend 'nickname'
  bio?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface University {
  id: number;
  name: string;
  name_pl?: string;
  name_en?: string;
  city: string;
  region: string;
  description?: string;
  image_url?: string;
  banner_url?: string;
  is_approved: boolean;
}

export interface Faculty {
  id: number;
  name: string;
  image_url?: string;
  university_id: number;
}

export interface FieldOfStudy {
  id: number;
  name: string;
  degree_level?: string;
  faculty_id: number;
}

export interface Subject {
  id: number;
  name: string;
  semester?: number;
  field_of_study_id: number;
}

export interface Note {
  id: number;
  title?: string;
  content?: string;
  score: number;
  image_url?: string;
  video_url?: string;
  link_url?: string;
  created_at: string;
  university_id: number;
  subject_id?: number;
  author: User;
  subject?: Subject;
}

export interface Review {
  id: number;
  rating: number;
  content: string;
  created_at: string;
  user: User;
  university_id: number;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: User;
  note_id: number;
}

export interface ImageRequest {
  id: number;
  university_id: number;
  new_image_url: string;
  status: string;
  created_at: string;
}

export interface PendingItems {
  notes: Note[];
  universities: University[];
  faculties: Faculty[];
  fields: FieldOfStudy[];
  subjects: Subject[];
  image_requests: ImageRequest[];
}