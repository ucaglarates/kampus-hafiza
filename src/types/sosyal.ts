import type { KullaniciProfili } from "./profil";

export type AkisSekmesi =
  | "anasayfa"
  | "takip"
  | "arastir"
  | "bildirimler"
  | "raporlar"
  | "topluluklar"
  | "profil";

export type IcerikRaporu = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "community" | "profile";
  post_id: string | null;
  comment_id: string | null;
  community_id: string | null;
  profile_id: string | null;
  reason:
    | "spam"
    | "harassment"
    | "copyright"
    | "privacy"
    | "misinformation"
    | "other";
  details: string;
  status: "pending" | "reviewed" | "resolved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Topluluk = {
  id: string;
  founder_id: string;
  name: string;
  description: string;
  faculty: string;
  department: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ToplulukUyesi = {
  community_id: string;
  user_id: string;
  role: "member" | "admin" | "founder";
  joined_at: string;
};

export type Gonderi = {
  id: string;
  author_id: string;
  community_id: string | null;
  body: string;
  category: string;
  department: string;
  tags: string[];
  moderation_status: "pending" | "approved" | "rejected";
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Yorum = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Begeni = {
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Takip = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Bildirim = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type:
    | "follow"
    | "comment"
    | "like"
    | "post_approved"
    | "post_rejected"
    | "community_join";
  post_id: string | null;
  community_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type CanliSosyalVeriler = {
  gonderiler: Gonderi[];
  profiller: KullaniciProfili[];
  topluluklar: Topluluk[];
  uyelikler: ToplulukUyesi[];
  yorumlar: Yorum[];
  begeniler: Begeni[];
  takipler: Takip[];
  bildirimler: Bildirim[];
  raporlar: IcerikRaporu[];
};
