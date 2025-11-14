import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { UserProfile, UserProfileDTO } from '@gamebox/shared';

@Injectable()
export class ProfileService {
  constructor(private readonly db: SupabaseService, private readonly authService: AuthService) {}
  private readonly logger = new Logger(ProfileService.name);
  private readonly avatarGeneratorUrl = process.env.AVATAR_GENERATOR_URL;
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET;
  private readonly maxFileSize = parseInt(process.env.MAX_AVATAR_SIZE);
  private readonly allowedTypes = process.env.ALLOWED_IMAGE_TYPES.split(',');

  async getProfiles(): Promise<UserProfile[]> {
    this.logger.debug('Fetching all profiles');

    const { data, error } = await this.db.supabase.from('user_profiles').select('*');

    if (error) {
      this.db.handleSupabaseError('getProfiles', error);
    }

    this.logger.debug('Profiles fetched successfully', {
      count: data?.length || 0,
    });

    return data || [];
  }

  async getProfileById(id: string): Promise<UserProfile> {
    this.logger.debug('Fetching profile by id', id);
    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.db.handleSupabaseError('getProfileById', error, id);
    }

    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    this.logger.debug('Profile fetched successfully', {
      id,
      profile: data,
    });

    return data;
  }

  async getProfilesByIds(ids: string[]): Promise<UserProfile[]> {
    this.logger.debug('Fetching profiles by ids', ids);
    const { data, error } = await this.db.supabase.from('user_profiles').select('*').in('id', ids);

    if (error) {
      this.db.handleSupabaseError('getProfilesByIds', error, ids);
    }

    if (!data) {
      throw new NotFoundException('Profiles not found');
    }

    this.logger.debug('Profiles fetched successfully', {
      count: data?.length || 0,
    });

    return data || [];
  }

  async getProfilesByUsernames(usernames: string[]): Promise<UserProfile[]> {
    this.logger.debug('Fetching profiles by usernames', usernames);
    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .select('*')
      .in('name', usernames);

    if (error) {
      this.db.handleSupabaseError('getProfilesByUsernames', error, usernames);
    }

    if (!data) {
      throw new NotFoundException('Profiles not found');
    }

    this.logger.debug('Profiles fetched successfully', {
      count: data?.length || 0,
    });

    return data || [];
  }

  async getProfileByUsername(username: string): Promise<UserProfile> {
    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      this.db.handleSupabaseError('getProfileByUsername', error, username);
    }

    if (!data) {
      this.logger.warn('Profile not found', username);
      throw new NotFoundException('Profile not found');
    }

    return data;
  }

  async updateProfile(username: string, updates: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    this.logger.debug('Updating profile', { username, updates });

    const currentProfile = await this.getProfileByUsername(username);

    if (updates.username && updates.username !== username) {
      const isAvailable = await this.authService.isUsernameAvailable(
        updates.username,
        currentProfile.id,
      );
      if (!isAvailable) {
        this.logger.warn('Username is already taken', { requestedUsername: updates.username });
        throw new ConflictException('Username is already taken');
      }
    }

    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .update(updates)
      .eq('username', username)
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('updateProfile', error, username);
    }

    if (!data) {
      this.logger.warn('Profile not found for update', username);
      throw new NotFoundException('Profile not found');
    }

    this.logger.log('Profile updated successfully', username);
    return data;
  }

  async getProfileAvatar(username: string): Promise<string> {
    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('username', username)
      .single();

    if (error) {
      this.db.handleSupabaseError('getProfileAvatar', error, username);
    }

    if (!data) {
      this.logger.warn('Profile not found', username);
      throw new NotFoundException('Profile not found');
    }

    return data.avatar_url;
  }

  async generateAvatarUrl(userId: string): Promise<string> {
    return `${this.avatarGeneratorUrl}${userId}`;
  }

  async searchUsers(query: string, limit = 10): Promise<UserProfileDTO[]> {
    this.logger.debug('Searching users', { query, limit });

    if (!query || query.trim().length < 2) {
      this.logger.warn('Search query too short', { query });
    }

    const searchTerm = `%${query.trim()}%`;

    const { data, error } = await this.db.supabase
      .from('user_profiles')
      .select('*')
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      this.db.handleSupabaseError('searchUsers', error, { query, limit });
    }

    this.logger.debug('User search completed', { query, resultsCount: data?.length || 0 });

    const userProfiles: UserProfileDTO[] = data.map((user) => this.mapUserProfileToDTO(user));

    return userProfiles || [];
  }

  async uploadFileToStorage(
    username: string,
    file: any,
    fileName?: string,
  ): Promise<{ path: string; url: string; fileName: string }> {
    this.validateFile(file);

    Logger.debug('Uploading file to storage: ', { username, fileName });
    const fileNameFromFile = file.originalname || file.name || 'file';
    const fileExtension = fileNameFromFile.split('.').pop() || 'bin';
    const uniqueFileName = fileName || `avatar-${Date.now()}.${fileExtension}`;
    const storagePath = `${username}/${uniqueFileName}`;
    const fileBuffer = file.buffer || file.data || file;
    const contentType = file.mimetype || file.type || 'application/octet-stream';

    const { error } = await this.db.supabase.storage
      .from(this.storageBucket)
      .upload(storagePath, fileBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (error) {
      this.db.handleSupabaseError('uploadFileToStorage', error, username);
    }

    const { data: urlData } = this.db.supabase.storage
      .from(this.storageBucket)
      .getPublicUrl(storagePath);

    this.logger.debug('File uploaded to storage successfully', {
      username,
      fileName,
      storagePath,
      url: urlData.publicUrl,
    });

    return {
      path: storagePath,
      url: urlData.publicUrl,
      fileName: uniqueFileName,
    };
  }

  async deleteFileFromStorage(storagePath: string): Promise<void> {
    this.logger.debug('Deleting file from storage', { storagePath });
    this.validateFile(storagePath);

    const { error } = await this.db.supabase.storage.from(this.storageBucket).remove([storagePath]);

    if (error) {
      this.db.handleSupabaseError('deleteFileFromStorage', error, {
        storagePath,
      });
    }
  }

  private validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size is too large');
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type is not allowed');
    }
  }

  public mapUserProfileToDTO(user: UserProfile): UserProfileDTO {
    return {
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at,
    };
  }
}
