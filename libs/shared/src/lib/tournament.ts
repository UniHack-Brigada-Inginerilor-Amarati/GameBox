import { Game } from './game';

export interface Tournament {
  id: number;
  slug: string;
  name: string;
  description: string;
  media?: {
    url: string;
    alt?: string;
  };
  date: string; // ISO date string
  time: string; // ISO time string
  game: Game;
  maxPlayers: number;
  currentPlayers?: number; // Number of registered players
  isRegistered?: boolean; // Whether the current user is registered
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: number;
  playerId: string;
  registeredAt: string;
  status: 'registered' | 'cancelled' | 'completed';
}

