import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GameScore } from '@gamebox/shared';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
    
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables. AI analysis will not be available.');
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

  async analyzeGameResult(gameResult: any): Promise<GameScore> {
    if (!this.model) {
      throw new BadRequestException('Gemini AI is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    try {
      const prompt = this.buildAnalysisPrompt(gameResult);
      
      this.logger.debug('Sending game result to Gemini AI for analysis');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug(`Received AI response: ${text}`);

      const gameScore = this.parseAIResponse(text);
      this.validateGameScore(gameScore);

      this.logger.log('Successfully analyzed game result with Gemini AI');
      return gameScore;
    } catch (error) {
      this.logger.error(`Failed to analyze game result with Gemini AI: ${error.message}`, error.stack);
      throw new BadRequestException(`AI analysis failed: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(gameResult: any): string {
    const gameResultJson = JSON.stringify(gameResult, null, 2);
    
    return `You are analyzing a video game match result to evaluate a player's performance across 6 ability categories.

Game Result Data:
${gameResultJson}

Please analyze the player's performance and assign a score (0-100) for each of the following 6 abilities:

1. **mentalFortitudeComposure**: How well the player handled pressure, maintained focus, and stayed composed during difficult situations
2. **adaptabilityDecisionMaking**: How well the player adapted to changing situations and made good decisions
3. **aimMechanicalSkill**: The player's mechanical skill, accuracy, and technical execution
4. **gameSenseAwareness**: The player's understanding of game mechanics, map awareness, and situational awareness
5. **teamworkCommunication**: How well the player worked with teammates, communicated, and coordinated
6. **strategy**: The player's strategic thinking, planning, and tactical execution

Return your response as a valid JSON object with the following structure:
{
  "mentalFortitudeComposure": <number 0-100>,
  "adaptabilityDecisionMaking": <number 0-100>,
  "aimMechanicalSkill": <number 0-100>,
  "gameSenseAwareness": <number 0-100>,
  "teamworkCommunication": <number 0-100>,
  "strategy": <number 0-100>
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
    
    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
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
      
      if (typeof gameScore[field] !== 'number' || gameScore[field] < 0 || gameScore[field] > 100) {
        throw new BadRequestException(`AI response has invalid score for ${field}: ${gameScore[field]}`);
      }
    }
  }
}

