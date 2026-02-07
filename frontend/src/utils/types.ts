/**
 * Centralized TypeScript type definitions for Colloq.
 * These types map to the backend Pydantic schemas / SQLAlchemy models.
 * Updated to include NoteImage for the Rich Notes feature.
 */

export interface User {
  id: number;
  email: string;
  nickname: string;
  username?: string; // Frontend alias for nickname
  bio?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_verified: boolean;
  reputation_points: number;
  uploads_count: number;
  university_id?: number;
  created_at?: string;
}

export interface University {
  id: number;
  name: string;
  name_pl?: string;
  name_en?: string;
  city: string;
  region: string;
  country?: string;
  description?: string;
  image_url?: string;
  banner_url?: string;
  is_approved: boolean;
  created_at?: string;
  faculties?: Faculty[];
  notes?: Note[];
}

export interface Faculty {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  university_id: number;
  is_approved?: boolean;
}

export interface FieldOfStudy {
  id: number;
  name: string;
  degree_level?: string;
  faculty_id: number;
  is_approved?: boolean;
}

export interface Subject {
  id: number;
  name: string;
  semester?: number;
  field_of_study_id: number;
  is_approved?: boolean;
}

/**
 * NoteImage - represents a single image attached to a note.
 * Part of the Rich Notes feature (one-to-many with Note).
 */
export interface NoteImage {
  id: number;
  note_id: number;
  image_url: string;
  caption?: string;
  position: number;
  created_at?: string;
}

export interface Note {
  id: number;
  title?: string;
  content?: string;
  score: number;
  file_url?: string;
  image_url?: string; // Legacy single image
  video_url?: string;
  link_url?: string;
  created_at: string;
  university_id: number;
  subject_id?: number;
  user_id?: number;
  is_approved?: boolean;
  author: User;
  subject?: Subject;
  images: NoteImage[]; // Rich Notes: multiple images
}

export interface Review {
  id: number;
  rating: number;
  content?: string;
  created_at: string;
  user: User;
  university_id?: number;
  note_id?: number;
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
  submitted_by_id: number;
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

export interface SearchResult {
  fields: any[];
  subjects: any[];
}

export interface ActivityItem {
  type: string;
  title?: string;
  description?: string;
  rating?: number;
  comment?: string;
  created_at: string;
  user_nickname: string;
  note_title?: string;
}

export interface LeaderboardUser {
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
}
