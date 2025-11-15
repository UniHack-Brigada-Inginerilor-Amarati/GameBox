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
      mentalFortitudeComposure?: Game;
      adaptabilityDecisionMaking?: Game;
      aimMechanicalSkill?: Game;
      gameSenseAwareness?: Game;
      teamworkCommunication?: Game;
      strategy?: Game;
    };
}