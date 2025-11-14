export interface Participant {
  id?: string;
  name: string;
  email: string;
  confirmed: boolean;
  user_id?: string; // Supabase auth user ID if they have an account
}

export interface Reservation {
  id: string;
  owner_id: string;
  slot_time: string; // the Gamebox Time Slot (e.g., "14:00")
  date: string; // ISO date string (no time)
  game_mode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  is_public: boolean; // New field: controls if anyone can join
  max_participants: number; // New field: configurable participant limit
  participants: Participant[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show';
  created_at: string;
  updated_at: string;
  share_token?: string;
  is_owner?: boolean; // New field: indicates if current user is the owner
}

export interface CreateReservationRequest {
  slot_time: string;
  date: string;
  game_mode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  is_public?: boolean; // Optional: defaults to true
  max_participants?: number; // Optional: defaults to 4
  participants: Omit<Participant, 'id' | 'confirmed' | 'user_id'>[];
}

export interface UpdateReservationRequest {
  slot_time?: string;
  date?: string;
  game_mode?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  is_public?: boolean;
  max_participants?: number;
  participants?: Participant[];
  status?: 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show';
}

// Note: ReservationToken interface removed - using direct reservation IDs for share links

export interface TimeSlot {
  time: string;
  available: boolean;
  reservation_id?: string;
}

export interface GameMode {
  id: string;
  name: string;
  description: string;
  max_players: number;
  min_players: number;
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'tug-of-war',
    name: 'Tug-of-War',
    description: 'Classic team sport with rope pulling',
    max_players: 20,
    min_players: 8,
  },
  {
    id: 'battleship',
    name: 'Battleship',
    description: 'Strategy guessing game for two players',
    max_players: 2,
    min_players: 2,
  },
  {
    id: 'spikeball',
    name: 'Spikeball',
    description: 'Fast-paced 2-on-2 sport with round net',
    max_players: 4,
    min_players: 4,
  },
  {
    id: 'capture-the-flag',
    name: 'Capture the Flag',
    description: 'Outdoor team game with flag capturing',
    max_players: 30,
    min_players: 6,
  },
  {
    id: 'scavenger-hunt',
    name: 'Scavenger Hunt',
    description: 'Adventure game with item searching',
    max_players: 50,
    min_players: 4,
  },
];

export const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00'];
