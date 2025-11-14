import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ProfileService } from '../profile/profile.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
  ) {}
  private readonly logger = new Logger(AdminGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const profile = await this.authService.verifyJWT(token);
      if (!profile.role) {
        throw new ForbiddenException('User role not found');
      }

      if (!this.isAdminOrModerator(profile.role)) {
        this.logger.warn('Insufficient permissions. Admin or moderator role required.', {
          userId: profile.id,
          userRole: profile.role,
        });
        throw new ForbiddenException('Insufficient permissions. Admin or moderator role required.');
      }

      request['user'] = {
        id: profile.id,
        username: profile.username,
        role: profile.role,
      };

      this.logger.debug('User role verified successfully', {
        userId: profile.id,
        userRole: profile.role,
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error in admin guard:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private isAdminOrModerator(role: string): boolean {
    const allowedRoles = ['admin', 'moderator'];
    return allowedRoles.includes(role.toLowerCase());
  }
}
