export interface AdminReservation {
  id: string;
  owner_id: string;
  slot_time: string;
  date: string;
  game_mode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  is_public: boolean;
  max_participants: number;
  participants?: Array<{
    reservation_id: string;
    user_id: string;
    confirmed: boolean;
  }>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show';
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_email?: string;
}

export interface AdminStats {
  totalReservations: number;
  todayBookings: number;
  activeUsers: number;
  revenue: number;
}
