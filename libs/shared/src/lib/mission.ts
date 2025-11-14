import { Game } from "./game";

export interface Mission {
    slug: string;
    name: string;
    description: string;
    media?: {
      url: string;
      alt?: string;
    };
    games: {
      strengthEndurance: Game;
      agilitySpeed: Game;
      aimPrecision: Game;
      memoryAttention: Game;
      communication: Game;
      logicProblemSolving: Game;
    };
}