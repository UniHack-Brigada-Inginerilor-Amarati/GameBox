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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AbilityService } from './ability.service';
import { UserProfile, UserProfileDTO, AbilityScores } from '@gamebox/shared';

@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly abilityService: AbilityService,
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
    this.logger.debug('GET /profiles/me/abilities - Fetching ability scores', {
      userId: req.user.id,
    });
    const profile = await this.profileService.getProfileByUsername(req.user.username);
    return this.abilityService.calculateAbilityScores(profile.id);
  }

  @Get(':username/abilities')
  @UseGuards(AuthGuard)
  async getUserAbilities(@Param('username') username: string): Promise<AbilityScores> {
    this.logger.debug('GET /profiles/:username/abilities - Fetching ability scores', {
      username,
    });
    const profile = await this.profileService.getProfileByUsername(username);
    return this.abilityService.calculateAbilityScores(profile.id);
  }
}
