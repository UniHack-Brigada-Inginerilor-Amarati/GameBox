import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface LeagueMatch {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: any[];
    platformId: string;
    queueId: number;
    teams: any[];
    tournamentCode?: string;
  };
}

interface ValorantMatch {
  metadata: {
    matchid: string;
    map: string;
    game_version: string;
    game_length: number;
    game_start_patched: string;
    rounds: any[];
    season_id: string;
    mode: string;
    region: string;
    cluster: string;
  };
  players: {
    all_players: any[];
    red: any[];
    blue: any[];
  };
  teams: {
    red: any;
    blue: any;
  };
  rounds: any[];
}

@Injectable()
export class RiotService {
  private readonly logger = new Logger(RiotService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://europe.api.riotgames.com'; // Europe region for account API
  private readonly leagueBaseUrl = 'https://europe.api.riotgames.com'; // Europe region for League matches API

  constructor(private readonly httpService: HttpService) {
    this.apiKey = process.env.RIOT_API_KEY;
    if (!this.apiKey) {
      this.logger.warn('RIOT_API_KEY not found in environment variables');
    }
  }

  private getHeaders() {
    return {
      'X-Riot-Token': this.apiKey,
    };
  }

  /**
   * Get PUUID from Riot username (gameName#tagLine format)
   */
  async getPuuidByRiotId(gameName: string, tagLine: string, region: string = 'americas'): Promise<string> {
    if (!this.apiKey) {
      throw new BadRequestException('Riot API key is not configured');
    }

    try {
      const url = `${this.baseUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      this.logger.debug(`Fetching PUUID for ${gameName}#${tagLine} (Europe region)`);

      const response = await firstValueFrom(
        this.httpService.get<RiotAccount>(url, { headers: this.getHeaders() })
      );

      return response.data.puuid;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundException(`Riot account not found: ${gameName}#${tagLine}`);
      }
      if (status === 403) {
        throw new BadRequestException('Invalid Riot API key or insufficient permissions');
      }
      this.logger.error(`Failed to fetch PUUID: ${error.message}`, error.response?.data);
      throw new BadRequestException(`Failed to fetch Riot account: ${error.message}`);
    }
  }

  /**
   * Parse Riot username (gameName#tagLine or gameName-tagLine)
   */
  parseRiotUsername(riotUsername: string): { gameName: string; tagLine: string } {
    const separator = riotUsername.includes('#') ? '#' : '-';
    const parts = riotUsername.split(separator);
    
    if (parts.length !== 2) {
      throw new BadRequestException(`Invalid Riot username format. Expected: gameName#tagLine or gameName-tagLine`);
    }

    return {
      gameName: parts[0].trim(),
      tagLine: parts[1].trim(),
    };
  }

  /**
   * Get all match IDs from the past week and full details of the last match
   */
  async getLeagueMatchesPastWeek(riotUsername: string, region: string = 'americas'): Promise<{
    matchIds: string[];
    lastMatchDetails: LeagueMatch;
  }> {
    if (!this.apiKey) {
      throw new BadRequestException('Riot API key is not configured');
    }

    try {
      // Parse username
      const { gameName, tagLine } = this.parseRiotUsername(riotUsername);

      // Get PUUID
      const puuid = await this.getPuuidByRiotId(gameName, tagLine, region);

      // Calculate timestamps for past week (7 days ago to now)
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      // Convert to seconds (Riot API uses Unix timestamps in seconds, not milliseconds)
      const startTime = Math.floor(oneWeekAgo / 1000);
      const endTime = Math.floor(now / 1000);

      // Fetch recent matches (Riot API returns matches in reverse chronological order - newest first)
      // We'll fetch more matches and filter by date client-side to ensure we get all from past week
      // Note: startTime/endTime parameters may not be supported in all API versions, so we fetch many matches
      const matchHistoryUrl = `${this.leagueBaseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100`;
      this.logger.debug(`Fetching League match history for PUUID: ${puuid}`, {
        startTime,
        endTime,
        startTimeDate: new Date(oneWeekAgo).toISOString(),
        endTimeDate: new Date(now).toISOString(),
      });

      let matchHistoryResponse;
      try {
        matchHistoryResponse = await firstValueFrom(
          this.httpService.get<string[]>(matchHistoryUrl, { headers: this.getHeaders() })
        );
      } catch (error: any) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        this.logger.error(`Riot API match history request failed`, {
          status,
          errorData,
          url: matchHistoryUrl,
          puuid,
        });
        
        if (status === 404) {
          throw new NotFoundException(`No League of Legends matches found for ${riotUsername}`);
        }
        if (status === 403) {
          throw new BadRequestException('Invalid Riot API key or insufficient permissions');
        }
        throw error;
      }

      let allMatchIds = matchHistoryResponse.data || [];
      
      if (!Array.isArray(allMatchIds)) {
        this.logger.error(`Unexpected response format from Riot API`, {
          data: allMatchIds,
          url: matchHistoryUrl,
        });
        throw new BadRequestException('Invalid response format from Riot API');
      }
      
      if (allMatchIds.length === 0) {
        throw new NotFoundException(`No League of Legends matches found for ${riotUsername}`);
      }

      this.logger.debug(`Found ${allMatchIds.length} total matches, filtering for past week`);

      // Filter matches from past week by fetching match details and checking timestamps
      // We'll check matches until we find one older than a week (matches are sorted newest first)
      const matchIdsPastWeek: string[] = [];
      let lastMatchDetails: LeagueMatch | null = null;

      for (let i = 0; i < Math.min(allMatchIds.length, 50); i++) {
        const matchId = allMatchIds[i];
        try {
          const matchUrl = `${this.leagueBaseUrl}/lol/match/v5/matches/${matchId}`;
          const matchResponse = await firstValueFrom(
            this.httpService.get<LeagueMatch>(matchUrl, { headers: this.getHeaders() })
          );

          const match = matchResponse.data;
          
          if (!match || !match.info || !match.info.gameCreation) {
            this.logger.warn(`Invalid match data for ${matchId}`);
            continue;
          }

          const matchTimestamp = match.info.gameCreation; // This is in milliseconds
          
          // Store the first (most recent) match details
          if (i === 0) {
            lastMatchDetails = match;
          }

          // Check if match is within past week (gameCreation is in milliseconds)
          if (matchTimestamp >= oneWeekAgo) {
            matchIdsPastWeek.push(matchId);
            this.logger.debug(`Match ${matchId} is within past week: ${new Date(matchTimestamp).toISOString()}`);
          } else {
            // Matches are returned in reverse chronological order (newest first)
            // If we hit a match older than a week, we can stop checking
            this.logger.debug(`Match ${matchId} is older than a week: ${new Date(matchTimestamp).toISOString()}, stopping search`);
            break;
          }
        } catch (error: any) {
          this.logger.warn(`Failed to fetch match ${matchId}: ${error.message}`);
          // Continue with next match
        }
      }

      if (matchIdsPastWeek.length === 0) {
        throw new NotFoundException(
          `No League of Legends matches found for ${riotUsername} in the past week (${new Date(oneWeekAgo).toISOString()} to ${new Date(now).toISOString()})`
        );
      }

      this.logger.debug(`Found ${matchIdsPastWeek.length} matches in the past week`);

      // Use the last match details we already fetched, or fetch it if we didn't get it
      if (!lastMatchDetails) {
        const lastMatchId = matchIdsPastWeek[0];
        const matchUrl = `${this.leagueBaseUrl}/lol/match/v5/matches/${lastMatchId}`;
        this.logger.debug(`Fetching League match details: ${lastMatchId}`);

        try {
          const matchResponse = await firstValueFrom(
            this.httpService.get<LeagueMatch>(matchUrl, { headers: this.getHeaders() })
          );
          lastMatchDetails = matchResponse.data;
        } catch (error: any) {
          const status = error.response?.status;
          const errorData = error.response?.data;
          this.logger.error(`Failed to fetch match details`, {
            status,
            errorData,
            matchId: lastMatchId,
            url: matchUrl,
          });
          
          if (status === 404) {
            throw new NotFoundException(`Match details not found for match ID: ${lastMatchId}`);
          }
          throw new BadRequestException(`Failed to fetch match details: ${error.message}`);
        }
      }
      
      if (!lastMatchDetails || !lastMatchDetails.info) {
        throw new BadRequestException('Invalid match data received from Riot API');
      }

      return {
        matchIds: matchIdsPastWeek,
        lastMatchDetails,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundException(`No League of Legends matches found for ${riotUsername}`);
      }
      this.logger.error(`Failed to fetch League matches: ${error.message}`, {
        error: error.response?.data,
        status: error.response?.status,
      });
      throw new BadRequestException(`Failed to fetch League of Legends matches: ${error.message}`);
    }
  }

  /**
   * Get last League of Legends match for a player
   */
  async getLastLeagueMatch(riotUsername: string, region: string = 'americas'): Promise<LeagueMatch> {
    if (!this.apiKey) {
      throw new BadRequestException('Riot API key is not configured');
    }

    try {
      // Parse username
      const { gameName, tagLine } = this.parseRiotUsername(riotUsername);

      // Get PUUID
      const puuid = await this.getPuuidByRiotId(gameName, tagLine, region);

      // Get match history (last match)
      // Note: Riot API typically returns matches from the last 90 days
      // Ranked matches may be available longer, but normal/ARAM matches have shorter retention
      const matchHistoryUrl = `${this.leagueBaseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`;
      this.logger.debug(`Fetching League match history for PUUID: ${puuid} (Europe region)`);

      const matchHistoryResponse = await firstValueFrom(
        this.httpService.get<string[]>(matchHistoryUrl, { headers: this.getHeaders() })
      );

      const matchIds = matchHistoryResponse.data;
      if (!matchIds || matchIds.length === 0) {
        throw new NotFoundException(`No League of Legends matches found for ${riotUsername}`);
      }

      // Get the most recent match details
      const lastMatchId = matchIds[0];
      const matchUrl = `${this.leagueBaseUrl}/lol/match/v5/matches/${lastMatchId}`;
      this.logger.debug(`Fetching League match details: ${lastMatchId}`);

      const matchResponse = await firstValueFrom(
        this.httpService.get<LeagueMatch>(matchUrl, { headers: this.getHeaders() })
      );

      return matchResponse.data;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundException(`No League of Legends matches found for ${riotUsername}`);
      }
      this.logger.error(`Failed to fetch League match: ${error.message}`, error.response?.data);
      throw new BadRequestException(`Failed to fetch League of Legends match: ${error.message}`);
    }
  }

  /**
   * Get last Valorant match for a player
   */
  async getLastValorantMatch(riotUsername: string, region: string = 'na'): Promise<ValorantMatch> {
    if (!this.apiKey) {
      throw new BadRequestException('Riot API key is not configured');
    }

    try {
      // Parse username
      const { gameName, tagLine } = this.parseRiotUsername(riotUsername);

      // Get PUUID
      const puuid = await this.getPuuidByRiotId(gameName, tagLine);

      // Map region for Valorant API
      const valorantRegionMap: Record<string, string> = {
        'na': 'na',
        'latam': 'na',
        'br': 'na',
        'eu': 'eu',
        'kr': 'kr',
        'ap': 'ap',
      };
      const valorantRegion = valorantRegionMap[region.toLowerCase()] || 'na';

      // Get match history (last match)
      // Valorant API uses a different endpoint structure
      const matchHistoryUrl = `https://pd.${valorantRegion}.a.pvp.net/match/v1/matchlist/${puuid}?startIndex=0&endIndex=1`;
      this.logger.debug(`Fetching Valorant match history for PUUID: ${puuid}`);

      const matchHistoryResponse = await firstValueFrom(
        this.httpService.get<{ History: Array<{ MatchID: string }> }>(matchHistoryUrl, { headers: this.getHeaders() })
      );

      const matches = matchHistoryResponse.data?.History;
      if (!matches || matches.length === 0) {
        throw new NotFoundException(`No Valorant matches found for ${riotUsername}`);
      }

      // Get the most recent match details
      const lastMatchId = matches[0].MatchID;
      // Valorant match details endpoint
      const matchUrl = `https://pd.${valorantRegion}.a.pvp.net/match/v1/matches/${lastMatchId}`;
      this.logger.debug(`Fetching Valorant match details: ${lastMatchId}`);

      const matchResponse = await firstValueFrom(
        this.httpService.get<ValorantMatch>(matchUrl, { headers: this.getHeaders() })
      );

      return matchResponse.data;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundException(`No Valorant matches found for ${riotUsername}`);
      }
      this.logger.error(`Failed to fetch Valorant match: ${error.message}`, error.response?.data);
      throw new BadRequestException(`Failed to fetch Valorant match: ${error.message}`);
    }
  }
}

