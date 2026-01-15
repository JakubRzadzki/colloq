export interface University {
  id: number;
  name: string;
  name_pl: string;
  name_en: string;
  city: string;
  region: string;
  type: string;
  image_url: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  university_id: number;
  author_id: number;
  image_url: string | null;
  is_approved: boolean;
  created_at: string;
  score: number;
  author: {
    email: string;
    nickname: string;
    is_verified: boolean;
  };
}

export interface User {
  id: number;
  email: string;
  nickname: string;
  university_id: number;
  is_admin: boolean;
  is_verified: boolean;
}

// ????