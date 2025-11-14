import { Game } from './game';
import { Media } from './media';

export interface ScratchCard {
  id: string;
  name: string;
  description: string;
  games: Game[];
  totalGames: number;
  completedGames: number;
  completionRate: number;
  isCompleted?: boolean;
  gameStatus?: { [gameSlug: string]: { isPlayed: boolean } };
  media?: Media;
}
