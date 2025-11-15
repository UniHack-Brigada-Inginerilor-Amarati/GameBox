export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: Date;
}

export interface FriendWithProfile {
  id: string;
  friend_id: string;
  username: string;
  email: string;
  avatar_url: string;
  created_at: Date;
}

export interface FriendRequestWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  username: string;
  email: string;
  avatar_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface SearchUserResult {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  is_friend: boolean;
  has_pending_request: boolean;
  request_sent_by_me: boolean;
}

