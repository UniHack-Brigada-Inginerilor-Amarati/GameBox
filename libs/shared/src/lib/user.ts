import { Role } from './role';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  role: Role;
  created_at: Date;
  riot_username?: string | null;
}

export interface UserProfileDTO {
  username: string;
  email: string;
  avatar_url: string;
  role: Role;
  created_at: Date;
  riot_username?: string | null;
}
