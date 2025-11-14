import { Role } from './role';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  role: Role;
  created_at: Date;
}

export interface UserProfileDTO {
  username: string;
  email: string;
  avatar_url: string;
  role: Role;
  created_at: Date;
}
