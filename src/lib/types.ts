// Hand-written mirrors of the PalembangPy API schemas (https://api.palembangpy.org/openapi.json).

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserBase {
  name: string;
  username?: string | null;
  telegram_id?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  is_admin?: boolean;
  is_staff?: boolean;
  points?: number;
}

export interface User extends UserBase {
  id: string;
  member_code: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface UserCreateResponse extends User {
  generated_password: string;
}

export type UserCreate = UserBase;
export type UserUpdate = Partial<UserBase>;

export interface EventBase {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_paid?: boolean | null;
  price?: number | null;
}

export interface CommunityEvent extends EventBase {
  id: string;
  created_at: string;
  deleted_at?: string | null;
}

export type EventUpdate = Partial<EventBase>;

/** Response schema is untyped in OpenAPI — fields are read defensively. */
export interface Registration {
  id?: string;
  user_id?: string;
  event_id?: string;
  user?: User | null;
  event?: CommunityEvent | null;
  created_at?: string;
  registered_at?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Certificate {
  id: string;
  code: string;
  user_id: string;
  event_id: string;
  speaker_id?: string | null;
  recipient_name: string;
  event_name: string;
  role: string;
  file_path: string;
  created_at: string;
}

export interface CertificateGenerate {
  user_ids: string[];
  role: string;
}

export interface SpeakerBase {
  user_id: string;
  event_id: string;
  topic?: string | null;
  bio?: string | null;
}

export interface Speaker extends SpeakerBase {
  id: string;
  created_at: string;
  deleted_at?: string | null;
  user?: User | null;
  event?: CommunityEvent | null;
}

export interface SpeakerUpdate {
  topic?: string | null;
  bio?: string | null;
}

export interface PartnerBase {
  name: string;
  type?: string | null;
  contact?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
}

export interface Partner extends PartnerBase {
  id: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface ProjectBase {
  title: string;
  description?: string | null;
  user_id: string;
  github_url?: string | null;
  demo_url?: string | null;
  image_url?: string | null;
  tags?: string | null;
  is_featured?: boolean;
  status?: string;
}

export interface Project extends ProjectBase {
  id: string;
  created_at: string;
}

export type ProjectUpdate = Partial<Omit<ProjectBase, "user_id">>;

export interface PublicStats {
  members: number;
  admins: number;
  staffs: number;
  events: number;
  speakers: number;
  partners: number;
  projects: number;
}
