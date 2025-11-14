import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProfile } from '@gamebox/shared';

@Injectable()
export class AuthService {
  constructor(private readonly db: SupabaseService) {}
  private readonly logger = new Logger(AuthService.name);

  async verifyJWT(token: string): Promise<UserProfile> {
    this.logger.debug('Verifying JWT token');

    const { data, error } = await this.db.supabase.auth.getUser(token);

    if (error) {
      this.logger.warn('JWT verification failed', { error: error.message });
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.debug('JWT verified successfully', { userId: data.user.id });

    const { data: profile, error: profileError } = await this.db.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      this.logger.warn('Profile retrieval failed', { profileError: profileError.message });
      throw new UnauthorizedException('Invalid token');
    }

    return profile;
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    this.logger.debug('Checking username availability', { username, excludeUserId });

    let query = this.db.supabase
      .from('user_profiles')
      .select('id, username')
      .eq('username', username);

    // Exclude current user if updating their own profile
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error checking username availability', error);
      throw new Error('Failed to check username availability');
    }

    const isAvailable = !data || data.length === 0;
    this.logger.debug('Username availability check result', { username, isAvailable });

    return isAvailable;
  }
}
