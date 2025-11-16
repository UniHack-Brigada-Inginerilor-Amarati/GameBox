import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RiotService } from '../riot/riot.service';
import { GeminiService } from '../gemini/gemini.service';
import { ProfileService } from './profile.service';
import { GameScore } from '@gamebox/shared';

@Injectable()
export class LeagueScoreService {
  private readonly logger = new Logger(LeagueScoreService.name);

  constructor(
    private readonly riotService: RiotService,
    private readonly geminiService: GeminiService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Calculate a user's score from their last League of Legends match using Gemini AI
   * @param userId - The user's ID
   * @param region - Optional region parameter (default: 'europe')
   * @param missionDescription - Optional mission description to consider in scoring
   * @returns GameScore with 6 ability categories
   */
  async calculateScoreFromLastMatch(
    userId: string,
    region: string = 'europe',
    missionDescription?: string,
  ): Promise<GameScore> {
    this.logger.debug('Calculating score from last League match', { userId, region });

    // Get user profile to retrieve riot_username
    const userProfile = await this.profileService.getProfileById(userId);

    if (!userProfile.riot_username) {
      throw new BadRequestException(
        'User does not have a Riot username configured. Please set your Riot username in your profile.',
      );
    }

    this.logger.debug('User has Riot username', {
      userId,
      riotUsername: userProfile.riot_username,
    });

    // Get the last League match
    const match = await this.riotService.getLastLeagueMatch(
      userProfile.riot_username,
      region,
    );

    // Get PUUID to find the player's participant data
    const { gameName, tagLine } = this.riotService.parseRiotUsername(
      userProfile.riot_username,
    );
    const puuid = await this.riotService.getPuuidByRiotId(gameName, tagLine, region);

    // Extract the player's participant data from the match
    const playerParticipant = this.extractPlayerParticipant(match, puuid);

    if (!playerParticipant) {
      throw new NotFoundException(
        'Could not find player data in the match. This should not happen.',
      );
    }

    this.logger.debug('Extracted player participant data', {
      participantId: playerParticipant.participantId,
      championId: playerParticipant.championId,
      teamId: playerParticipant.teamId,
    });

    // Prepare game result data for Gemini analysis
    // Include match context and player-specific stats
    const gameResult = {
      match: {
        matchId: match.metadata.matchId,
        gameMode: match.info.gameMode,
        gameType: match.info.gameType,
        queueId: match.info.queueId,
        gameDuration: match.info.gameDuration,
        gameVersion: match.info.gameVersion,
        teams: match.info.teams.map((team: any) => ({
          teamId: team.teamId,
          win: team.win,
          objectives: team.objectives,
        })),
      },
      player: playerParticipant,
    };

    // Use Gemini to analyze the match and calculate scores with mission context
    const gameScore = await this.geminiService.analyzeGameResult(
      gameResult,
      missionDescription,
    );

    this.logger.log('Successfully calculated League match score', {
      userId,
      matchId: match.metadata.matchId,
      hasMissionDescription: !!missionDescription,
    });

    return gameScore;
  }

  /**
   * Extract the player's participant data from a League match
   * @param match - The League match data
   * @param puuid - The player's PUUID
   * @returns The player's participant object or null if not found
   */
  private extractPlayerParticipant(match: any, puuid: string): any | null {
    // The metadata.participants array contains PUUIDs in the same order as info.participants
    const participantIndex = match.metadata.participants.indexOf(puuid);

    if (participantIndex === -1) {
      this.logger.warn('Player PUUID not found in match participants', { puuid });
      return null;
    }

    const participant = match.info.participants[participantIndex];

    if (!participant) {
      this.logger.warn('Participant data not found at index', {
        puuid,
        participantIndex,
      });
      return null;
    }

    return participant;
  }
}

