import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  FriendRequestWithProfile,
  FriendWithProfile,
  SearchUserResult,
} from '@gamebox/shared';

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}
  private readonly logger = new Logger(FriendsController.name);

  @Get('search')
  async searchUsers(
    @Request() req: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<SearchUserResult[]> {
    this.logger.debug('GET /friends/search - Searching users', {
      userId: req.user.id,
      query,
      limit,
    });

    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.friendsService.searchUsers(req.user.id, query, limitNumber);
  }

  @Post('requests/:userId')
  async sendFriendRequest(
    @Request() req: any,
    @Param('userId') addresseeId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug('POST /friends/requests/:userId - Sending friend request', {
      requesterId: req.user.id,
      addresseeId,
    });

    await this.friendsService.sendFriendRequest(req.user.id, addresseeId);
    return { success: true, message: 'Friend request sent successfully' };
  }

  @Post('requests/:requestId/accept')
  async acceptFriendRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ): Promise<FriendWithProfile> {
    this.logger.debug('POST /friends/requests/:requestId/accept - Accepting friend request', {
      userId: req.user.id,
      requestId,
    });

    return this.friendsService.acceptFriendRequest(req.user.id, requestId);
  }

  @Post('requests/:requestId/reject')
  async rejectFriendRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug('POST /friends/requests/:requestId/reject - Rejecting friend request', {
      userId: req.user.id,
      requestId,
    });

    await this.friendsService.rejectFriendRequest(req.user.id, requestId);
    return { success: true, message: 'Friend request rejected' };
  }

  @Delete('requests/:requestId')
  async cancelFriendRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug('DELETE /friends/requests/:requestId - Canceling friend request', {
      userId: req.user.id,
      requestId,
    });

    await this.friendsService.cancelFriendRequest(req.user.id, requestId);
    return { success: true, message: 'Friend request canceled' };
  }

  @Get()
  async getFriends(@Request() req: any): Promise<FriendWithProfile[]> {
    this.logger.debug('GET /friends - Getting friends list', {
      userId: req.user.id,
    });

    return this.friendsService.getFriends(req.user.id);
  }

  @Get('requests')
  async getFriendRequests(
    @Request() req: any,
  ): Promise<{
    received: FriendRequestWithProfile[];
    sent: FriendRequestWithProfile[];
  }> {
    this.logger.debug('GET /friends/requests - Getting friend requests', {
      userId: req.user.id,
    });

    return this.friendsService.getFriendRequests(req.user.id);
  }

  @Delete(':friendId')
  async removeFriend(
    @Request() req: any,
    @Param('friendId') friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.debug('DELETE /friends/:friendId - Removing friend', {
      userId: req.user.id,
      friendId,
    });

    await this.friendsService.removeFriend(req.user.id, friendId);
    return { success: true, message: 'Friend removed successfully' };
  }
}

