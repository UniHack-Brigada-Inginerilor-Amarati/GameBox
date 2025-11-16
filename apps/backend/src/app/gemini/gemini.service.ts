import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GameScore, AbilityScores, Game } from '@gamebox/shared';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-pro';

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not found in environment variables. AI analysis will not be available.',
      );
      this.genAI = null;
      this.model = null;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: modelName });
      this.logger.log(`Gemini AI client initialized successfully with model: ${modelName}`);
    } catch (error: any) {
      this.logger.error(`Failed to initialize Gemini AI client: ${error.message}`);
      this.genAI = null;
      this.model = null;
    }
  }

  async analyzeGameResult(gameResult: any, missionDescription?: string): Promise<GameScore> {
    if (!this.model) {
      throw new BadRequestException(
        'Gemini AI is not configured. Please set GEMINI_API_KEY environment variable.',
      );
    }

    try {
      const prompt = this.buildAnalysisPrompt(gameResult, missionDescription);

      this.logger.debug('Sending game result to Gemini AI for analysis', {
        hasMissionDescription: !!missionDescription,
      });
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Received AI response: ${text}`);

      const gameScore = this.parseAIResponse(text);
      this.validateGameScore(gameScore);

      this.logger.log('Successfully analyzed game result with Gemini AI');
      return gameScore;
    } catch (error) {
      this.logger.error(
        `Failed to analyze game result with Gemini AI: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`AI analysis failed: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(gameResult: any, missionDescription?: string): string {
    const gameResultJson = JSON.stringify(gameResult, null, 2);

    let missionContext = '';
    if (missionDescription && missionDescription.trim()) {
      missionContext = `

MISSION CONTEXT:
The player is attempting to complete a mission with the following description:
"${missionDescription.trim()}"

IMPORTANT SCORING CONSIDERATIONS:
1. If the mission description is a simple instruction like "play a game" or "complete a match", evaluate the performance normally without penalty.

2. If the mission description contains specific CHALLENGES or OBJECTIVES (e.g., "die less than 4 times", "get at least 10 kills", "achieve more than 150 CS", "don't feed", "get an S rank", etc.), you MUST:
   - First analyze the player's performance as you normally would
   - Then check if they met the specific mission requirements
   - If they FAILED to meet the requirements, apply a MODERATE penalty to all scores (reduce by 10-20%, but keep scores reasonable - don't be too harsh)
   - If they MET the requirements, maintain or slightly boost scores
   - The penalty should be proportional: minor failures = smaller penalty (5-10%), major failures = larger penalty (15-20%)
   - Do NOT reduce scores to extremely negative values unless the performance was genuinely very poor
   - Always consider the context: if they failed the challenge but played well overall, the penalty should be lighter

3. Examples:
   - Mission: "Die less than 4 times" + Player died 5 times = Apply 10-15% reduction to scores
   - Mission: "Get at least 10 kills" + Player got 8 kills = Apply 8-12% reduction to scores
   - Mission: "Play a game" + Any performance = No penalty, evaluate normally
   - Mission: "Get an S rank" + Player got B rank = Apply 12-18% reduction depending on how close they were`;
    }

    return `You are analyzing a video game match result to evaluate a player's performance across 6 ability categories.

Game Result Data:
${gameResultJson}${missionContext}

Please analyze the player's performance and assign a score for each of the following 6 abilities. Scores can range from negative values (for poor performance) to positive values (for good performance), with a typical range of -100 to 100:

1. **mentalFortitudeComposure**: How well the player handled pressure, maintained focus, and stayed composed during difficult situations. Negative scores indicate poor composure, tilting, or giving up.
2. **adaptabilityDecisionMaking**: How well the player adapted to changing situations and made good decisions. Negative scores indicate poor decision-making, inability to adapt, or consistently bad choices.
3. **aimMechanicalSkill**: The player's mechanical skill, accuracy, and technical execution. Negative scores indicate poor mechanical performance, missed shots, or technical errors.
4. **gameSenseAwareness**: The player's understanding of game mechanics, map awareness, and situational awareness. Negative scores indicate poor game sense, lack of awareness, or critical mistakes.
5. **teamworkCommunication**: How well the player worked with teammates, communicated, and coordinated. Negative scores indicate toxic behavior, lack of communication, or actively harming team coordination.
6. **strategy**: The player's strategic thinking, planning, and tactical execution. Negative scores indicate poor strategic decisions, lack of planning, or counterproductive tactics.

${missionDescription && missionDescription.trim() ? 'Remember to adjust scores based on whether the player met the mission requirements as described above.' : ''}

Return your response as a valid JSON object with the following structure:
{
  "mentalFortitudeComposure": <number, typically -100 to 100>,
  "adaptabilityDecisionMaking": <number, typically -100 to 100>,
  "aimMechanicalSkill": <number, typically -100 to 100>,
  "gameSenseAwareness": <number, typically -100 to 100>,
  "teamworkCommunication": <number, typically -100 to 100>,
  "strategy": <number, typically -100 to 100>
}

Only return the JSON object, no additional text or explanation.`;
  }

  private parseAIResponse(text: string): GameScore {
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(jsonText);

      return {
        mentalFortitudeComposure: this.normalizeScore(parsed.mentalFortitudeComposure),
        adaptabilityDecisionMaking: this.normalizeScore(parsed.adaptabilityDecisionMaking),
        aimMechanicalSkill: this.normalizeScore(parsed.aimMechanicalSkill),
        gameSenseAwareness: this.normalizeScore(parsed.gameSenseAwareness),
        teamworkCommunication: this.normalizeScore(parsed.teamworkCommunication),
        strategy: this.normalizeScore(parsed.strategy),
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      throw new BadRequestException(`Invalid AI response format: ${error.message}`);
    }
  }

  private normalizeScore(score: any): number {
    if (typeof score !== 'number') {
      const parsed = parseFloat(score);
      if (isNaN(parsed)) {
        return 0;
      }
      score = parsed;
    }

    // Clamp score between -100 and 100 to allow negative points
    return Math.max(-100, Math.min(100, Math.round(score)));
  }

  private validateGameScore(gameScore: GameScore): void {
    const requiredFields = [
      'mentalFortitudeComposure',
      'adaptabilityDecisionMaking',
      'aimMechanicalSkill',
      'gameSenseAwareness',
      'teamworkCommunication',
      'strategy',
    ];

    for (const field of requiredFields) {
      if (gameScore[field] === undefined || gameScore[field] === null) {
        throw new BadRequestException(`AI response missing required field: ${field}`);
      }

      if (
        typeof gameScore[field] !== 'number' ||
        gameScore[field] < -100 ||
        gameScore[field] > 100
      ) {
        throw new BadRequestException(
          `AI response has invalid score for ${field}: ${gameScore[field]}. Score must be between -100 and 100.`,
        );
      }
    }
  }

  async recommendGames(abilityScores: AbilityScores, availableGames: Game[]): Promise<Game[]> {
    if (!this.model) {
      throw new BadRequestException(
        'Gemini AI is not configured. Please set GEMINI_API_KEY environment variable.',
      );
    }

    try {
      const prompt = this.buildRecommendationPrompt(abilityScores, availableGames);

      this.logger.debug('Sending ability scores to Gemini AI for game recommendations');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Received AI response: ${text}`);

      const recommendedGameSlugs = this.parseRecommendationResponse(text);
      const recommendedGames = this.matchGamesBySlugs(recommendedGameSlugs, availableGames);

      this.logger.log(`Successfully generated ${recommendedGames.length} game recommendations`);
      return recommendedGames;
    } catch (error) {
      this.logger.error(
        `Failed to get game recommendations from Gemini AI: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`AI recommendation failed: ${error.message}`);
    }
  }

  private buildRecommendationPrompt(abilityScores: AbilityScores, availableGames: Game[]): string {
    const gamesList = availableGames.map((game) => ({
      slug: game.slug,
      name: game.name,
      description: game.description,
      abilities: game.abilities?.map((ability) => ({
        slug: ability.slug,
        name: ability.name,
        score: ability.score,
      })),
    }));

    const gamesJson = JSON.stringify(gamesList, null, 2);
    const scoresJson = JSON.stringify(
      {
        mentalFortitudeComposure: abilityScores.mentalFortitudeComposure.score,
        adaptabilityDecisionMaking: abilityScores.adaptabilityDecisionMaking.score,
        aimMechanicalSkill: abilityScores.aimMechanicalSkill.score,
        gameSenseAwareness: abilityScores.gameSenseAwareness.score,
        teamworkCommunication: abilityScores.teamworkCommunication.score,
        strategy: abilityScores.strategy.score,
        overall: abilityScores.overall.averageScore,
      },
      null,
      2,
    );

    return `You are a game recommendation system. Based on a player's ability scores from their spy card, recommend exactly 3 games that would be best suited for them to play.

Player's Ability Scores (out of 1000):
${scoresJson}

Available Games:
${gamesJson}

Each game has ability scores that indicate which abilities it tests. Match the player's strengths and weaknesses to games that would:
1. Help them improve their weaker abilities
2. Allow them to showcase their stronger abilities
3. Provide a balanced gaming experience

Return your response as a valid JSON array with exactly 3 game slugs (in order of recommendation, best first):
["game-slug-1", "game-slug-2", "game-slug-3"]

Only return the JSON array, no additional text or explanation.`;
  }

  private parseRecommendationResponse(text: string): string[] {
    try {
      // Try to extract JSON array from the response (in case there's extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Ensure we have exactly 3 recommendations
      const slugs = parsed.slice(0, 3).filter((slug) => typeof slug === 'string');
      
      if (slugs.length < 3) {
        this.logger.warn(`AI returned only ${slugs.length} recommendations, expected 3`);
      }

      return slugs;
    } catch (error) {
      this.logger.error(`Failed to parse AI recommendation response: ${error.message}`);
      throw new BadRequestException(`Invalid AI response format: ${error.message}`);
    }
  }

  private matchGamesBySlugs(slugs: string[], availableGames: Game[]): Game[] {
    const recommendedGames: Game[] = [];
    
    for (const slug of slugs) {
      const game = availableGames.find((g) => g.slug === slug);
      if (game) {
        recommendedGames.push(game);
      } else {
        this.logger.warn(`Game with slug '${slug}' not found in available games`);
      }
    }

    return recommendedGames;
  }
}
