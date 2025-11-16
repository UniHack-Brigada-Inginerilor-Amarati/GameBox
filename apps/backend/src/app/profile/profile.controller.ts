import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  UseInterceptors,
  UploadedFile,
  Logger,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AbilityService } from './ability.service';
import { UserProfile, UserProfileDTO, AbilityScores, GameScore, Game } from '@gamebox/shared';
import { LeagueScoreService } from './league-score.service';
import { MissionService } from '../missions/mission.service';
import { GeminiService } from '../gemini/gemini.service';
import { GameService } from '../games/game.service';
@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly abilityService: AbilityService,
    private readonly missionService: MissionService,
    private readonly leagueScoreService: LeagueScoreService,
    private readonly geminiService: GeminiService,
    private readonly gameService: GameService,
  ) {}
  private readonly logger = new Logger(ProfileController.name);

  @Get('all')
  @UseGuards(AuthGuard, AdminGuard)
  async getProfiles(): Promise<UserProfile[]> {
    this.logger.debug('GET /profiles/all - Fetching all profiles');
    return this.profileService.getProfiles();
  }

  @Get('search')
  @UseGuards(AdminGuard)
  async searchUsers(
    @Query('q') name: string,
    @Query('limit') limit?: string,
  ): Promise<UserProfile[]> {
    this.logger.debug('GET /profiles/search - Searching users', {
      name,
      limit,
    });

    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.profileService.searchUsers(name, limitNumber);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentProfile(@Request() req: any): Promise<UserProfileDTO> {
    this.logger.debug('GET /profiles/me - Fetching current user profile', {
      username: req.user.username,
    });
    return this.profileService.getProfileByUsername(req.user.username);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() updates: Partial<UserProfileDTO>,
  ): Promise<UserProfileDTO> {
    this.logger.debug('PATCH /profiles/me - Updating user profile', {
      username: req.user.username,
      updatedFields: Object.keys(updates),
    });
    return this.profileService.updateProfile(req.user.username, updates);
  }

  @Get('me/avatar')
  @UseGuards(AuthGuard)
  async generateCurrentAvatar(@Request() req: any): Promise<{ avatar_url: string }> {
    this.logger.debug('GET /profiles/me/avatar - Generating current user avatar', {
      username: req.user.username,
    });
    const avatarUrl = await this.profileService.generateAvatarUrl(req.user.username);
    return { avatar_url: avatarUrl };
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: any,
  ): Promise<{ avatar_url: string }> {
    this.logger.debug('POST /profiles/me/avatar - Uploading avatar', {
      username: req.user.username,
      fileName: file?.originalname,
      fileSize: file?.size,
    });
    const avatarUrl = await this.profileService.uploadFileToStorage(
      req.user.username,
      file,
      file.originalname,
    );
    return { avatar_url: avatarUrl.url };
  }

  @Get(':username')
  @UseGuards(AdminGuard)
  async getProfileByUsername(@Param('username') username: string): Promise<UserProfileDTO> {
    this.logger.debug('GET /profiles/:username - Fetching profile by username', { username });
    const profile = await this.profileService.getProfileByUsername(username);
    return this.profileService.mapUserProfileToDTO(profile);
  }

  @Get(':username/avatar')
  @UseGuards(AdminGuard)
  async getProfileAvatar(@Param('username') username: string): Promise<{ avatar_url: string }> {
    this.logger.debug('GET /profiles/:username/avatar - Generating avatar', {
      username,
    });
    const avatarUrl = await this.profileService.getProfileAvatar(username);
    return { avatar_url: avatarUrl };
  }

  @Patch(':username/avatar')
  @UseGuards(AdminGuard)
  async updateAvatar(
    @Param('username') username: string,
    @Body() body: { avatar_url: string },
  ): Promise<UserProfileDTO | null> {
    this.logger.debug('PUT /profiles/:id/avatar - Updating avatar', {
      username,
      avatar_url: body.avatar_url,
    });
    return this.profileService.updateProfile(username, {
      avatar_url: body.avatar_url,
    });
  }
  @Get('me/abilities')
  @UseGuards(AuthGuard)
  async getCurrentUserAbilities(@Request() req: any): Promise<AbilityScores> {
    this.logger.debug('GET /profiles/me/abilities - Fetching ability scores from spy card', {
      username: req.user.username,
    });
    try {
      // Try to get from spy card first
      return await this.abilityService.getAbilityScoresFromSpyCard(req.user.username);
    } catch (err) {
      // Fallback to calculating from game results if spy card doesn't exist
      this.logger.debug('Spy card not found, falling back to calculated scores', {
        username: req.user.username,
        error: err instanceof Error ? err.message : String(err),
      });
      return this.abilityService.calculateAbilityScores(req.user.username);
    }
  }

  @Get(':username/abilities')
  @UseGuards(AuthGuard)
  async getUserAbilities(@Param('username') username: string): Promise<AbilityScores> {
    this.logger.debug('GET /profiles/:username/abilities - Fetching ability scores from spy card', {
      username,
    });
    try {
      // Try to get from spy card first
      return await this.abilityService.getAbilityScoresFromSpyCard(username);
    } catch (err) {
      // Fallback to calculating from game results if spy card doesn't exist
      this.logger.debug('Spy card not found, falling back to calculated scores', {
        username,
        error: err instanceof Error ? err.message : String(err),
      });
      return this.abilityService.calculateAbilityScores(username);
    }
  }

  @Post(':username/spy-card/recalculate')
  @UseGuards(AuthGuard)
  async recalculateSpyCard(
    @Param('username') username: string,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    totalScore: number;
    overallRank: number;
    missionCount: number;
    message: string;
  }> {
    this.logger.debug('POST /profiles/:username/spy-card/recalculate - Recalculating spy card', {
      username,
      requesterUsername: req.user?.username,
    });

    // Allow users to recalculate their own spy card, or admins to recalculate any user's spy card
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';
    const isOwnProfile = req.user?.username === username;

    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException('You can only recalculate your own spy card');
    }

    return this.missionService.recalculateSpyCardFromMissions(username);
  }

  @Get('me/league-score')
  @UseGuards(AuthGuard)
  async getCurrentUserLeagueScore(
    @Request() req: any,
    @Query('region') region?: string,
  ): Promise<GameScore> {
    this.logger.debug('GET /profiles/me/league-score - Calculating League match score', {
      userId: req.user.id,
      region: region || 'europe',
    });
    return this.leagueScoreService.calculateScoreFromLastMatch(
      req.user.id,
      region || 'europe',
    );
  }

  @Get('me/game-recommendations')
  @UseGuards(AuthGuard)
  async getGameRecommendations(
    @Request() req: any,
  ): Promise<Array<Game & { recommendationReason: string }>> {
    this.logger.debug('GET /profiles/me/game-recommendations - Getting AI game recommendations', {
      username: req.user.username,
    });

    // Get user's ability scores
    let abilityScores: AbilityScores;
    try {
      abilityScores = await this.abilityService.getAbilityScoresFromSpyCard(req.user.username);
    } catch {
      // Fallback to calculated scores if spy card doesn't exist
      this.logger.debug('Spy card not found, using calculated scores', {
        username: req.user.username,
      });
      abilityScores = await this.abilityService.calculateAbilityScores(req.user.username);
    }

    // Get all available games
    const availableGames = await this.gameService.getGames();

    // Get AI recommendations
    const recommendedGames = await this.geminiService.recommendGames(
      abilityScores,
      availableGames,
    );

    this.logger.debug('Game recommendations generated', {
      username: req.user.username,
      recommendedCount: recommendedGames.length,
      gameSlugs: recommendedGames.map((g) => g.slug),
    });

    return recommendedGames;
  }
}
