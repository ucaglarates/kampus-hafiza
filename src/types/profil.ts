// ============================================================
// SUPABASE'TEKİ KULLANICI PROFİLİNİN TYPESCRIPT KARŞILIĞI
// ============================================================

export type KullaniciRolu =
  "student" | "assistant_moderator" | "moderator" | "founder";

export type KullaniciProfili = {
  id: string;
  email: string;
  full_name: string;
  university: string;
  faculty: string;
  department: string;
  class_year: string;
  expertise_areas: string[];
  role: KullaniciRolu;
  level: number;
  xp: number;
  verified_contributions: number;
  helpful_votes: number;
  streak_days: number;
  verification_test_completed: boolean;
  verification_test_score: number;
  verified_areas: string[];
  avatar_url: string | null;
  cover_url: string | null;
  legal_version: string;
  legal_accepted_at: string | null;
  cross_border_consent_at: string | null;
  age_confirmed_at: string | null;
  verification_test_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ToplulukProfili = Pick<
  KullaniciProfili,
  | "id"
  | "full_name"
  | "faculty"
  | "department"
  | "expertise_areas"
  | "role"
  | "level"
  | "xp"
  | "verified_contributions"
  | "helpful_votes"
  | "avatar_url"
  | "cover_url"
>;
