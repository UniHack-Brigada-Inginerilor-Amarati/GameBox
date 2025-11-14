import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  FriendRequest,
  FriendRequestStatus,
  FriendRequestWithProfile,
  FriendWithProfile,
  SearchUserResult,
} from '@gamebox/shared';

@Injectable()
export class FriendsService {
  constructor(private readonly db: SupabaseService) {}
  private readonly logger = new Logger(FriendsService.name);

  /**
   * Search for users by username or email
   */
  async searchUsers(userId: string, query: string, limit = 10): Promise<SearchUserResult[]> {
    this.logger.debug('Searching users', { userId, query, limit });

    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;

    // Search users by username or email
    const { data: users, error: usersError } = await this.db.supabaseAdmin
      .from('user_profiles')
      .select('id, username, email, avatar_url')
      .or(`username.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .neq('id', userId) // Exclude current user
      .order('username', { ascending: true })
      .limit(limit);

    if (usersError) {
      this.db.handleSupabaseError('searchUsers', usersError, { query, limit });
    }

    if (!users || users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.id);

    // Get existing friendships
    const { data: friendships } = await this.db.supabaseAdmin
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
      .in('friend_id', userIds);

    const friendIds = new Set(friendships?.map((f) => f.friend_id) || []);

    // Get pending friend requests (sent by me)
    const { data: sentRequests } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('requester_id, addressee_id, status')
      .eq('requester_id', userId)
      .in('addressee_id', userIds)
      .eq('status', FriendRequestStatus.PENDING);

    // Get pending friend requests (received by me)
    const { data: receivedRequests } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('requester_id, addressee_id, status')
      .in('requester_id', userIds)
      .eq('addressee_id', userId)
      .eq('status', FriendRequestStatus.PENDING);

    const pendingRequests = [...(sentRequests || []), ...(receivedRequests || [])];

    const pendingRequestMap = new Map<string, { sentByMe: boolean }>();
    pendingRequests?.forEach((req) => {
      if (req.requester_id === userId) {
        pendingRequestMap.set(req.addressee_id, { sentByMe: true });
      } else {
        pendingRequestMap.set(req.requester_id, { sentByMe: false });
      }
    });

    // Map results with friend status
    const results: SearchUserResult[] = users.map((user) => {
      const pendingRequest = pendingRequestMap.get(user.id);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        is_friend: friendIds.has(user.id),
        has_pending_request: !!pendingRequest,
        request_sent_by_me: pendingRequest?.sentByMe || false,
      };
    });

    this.logger.debug('User search completed', {
      query,
      resultsCount: results.length,
    });

    return results;
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<FriendRequest> {
    this.logger.debug('Sending friend request', { requesterId, addresseeId });

    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if users exist
    const { data: addressee } = await this.db.supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', addresseeId)
      .single();

    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const { data: existingFriendship1 } = await this.db.supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', requesterId)
      .eq('friend_id', addresseeId)
      .single();

    const { data: existingFriendship2 } = await this.db.supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', addresseeId)
      .eq('friend_id', requesterId)
      .single();

    const existingFriendship = existingFriendship1 || existingFriendship2;

    if (existingFriendship) {
      throw new ConflictException('Users are already friends');
    }

    // Check if there's already a pending request
    const { data: existingRequest1 } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('id, status')
      .eq('requester_id', requesterId)
      .eq('addressee_id', addresseeId)
      .eq('status', FriendRequestStatus.PENDING)
      .single();

    const { data: existingRequest2 } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('id, status')
      .eq('requester_id', addresseeId)
      .eq('addressee_id', requesterId)
      .eq('status', FriendRequestStatus.PENDING)
      .single();

    const existingRequest = existingRequest1 || existingRequest2;

    if (existingRequest) {
      throw new ConflictException('Friend request already exists');
    }

    // Create friend request
    const { data: friendRequest, error } = await this.db.supabaseAdmin
      .from('friend_requests')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: FriendRequestStatus.PENDING,
      })
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('sendFriendRequest', error, {
        requesterId,
        addresseeId,
      });
    }

    this.logger.log('Friend request sent successfully', {
      requesterId,
      addresseeId,
    });

    return friendRequest;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, requestId: string): Promise<FriendWithProfile> {
    this.logger.debug('Accepting friend request', { userId, requestId });

    // Get the friend request
    const { data: request, error: requestError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('addressee_id', userId)
      .eq('status', FriendRequestStatus.PENDING)
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Friend request not found or already processed');
    }

    // Update request status
    const { error: updateError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .update({ status: FriendRequestStatus.ACCEPTED })
      .eq('id', requestId);

    if (updateError) {
      this.db.handleSupabaseError('acceptFriendRequest', updateError, { requestId });
    }

    // Create friendship (bidirectional)
    const { error: friendError } = await this.db.supabaseAdmin.from('friends').insert([
      {
        user_id: userId,
        friend_id: request.requester_id,
      },
      {
        user_id: request.requester_id,
        friend_id: userId,
      },
    ]);

    if (friendError) {
      this.db.handleSupabaseError('acceptFriendRequest', friendError, { requestId });
    }

    // Get friend profile
    const { data: friendProfile } = await this.db.supabaseAdmin
      .from('user_profiles')
      .select('id, username, email, avatar_url')
      .eq('id', request.requester_id)
      .single();

    this.logger.log('Friend request accepted successfully', {
      userId,
      friendId: request.requester_id,
    });

    return {
      id: '',
      friend_id: request.requester_id,
      username: friendProfile.username,
      email: friendProfile.email,
      avatar_url: friendProfile.avatar_url,
      created_at: new Date(),
    };
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userId: string, requestId: string): Promise<void> {
    this.logger.debug('Rejecting friend request', { userId, requestId });

    const { data: request, error: requestError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('addressee_id', userId)
      .eq('status', FriendRequestStatus.PENDING)
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Friend request not found or already processed');
    }

    const { error } = await this.db.supabaseAdmin
      .from('friend_requests')
      .update({ status: FriendRequestStatus.REJECTED })
      .eq('id', requestId);

    if (error) {
      this.db.handleSupabaseError('rejectFriendRequest', error, { requestId });
    }

    this.logger.log('Friend request rejected successfully', { userId, requestId });
  }

  /**
   * Get all friends for a user
   */
  async getFriends(userId: string): Promise<FriendWithProfile[]> {
    this.logger.debug('Getting friends', { userId });

    // Get friend IDs
    const { data: friendships, error } = await this.db.supabaseAdmin
      .from('friends')
      .select('id, friend_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.db.handleSupabaseError('getFriends', error, { userId });
    }

    if (!friendships || friendships.length === 0) {
      return [];
    }

    // Get friend profiles
    const friendIds = friendships.map((f) => f.friend_id);
    const { data: profiles, error: profilesError } = await this.db.supabaseAdmin
      .from('user_profiles')
      .select('id, username, email, avatar_url')
      .in('id', friendIds);

    if (profilesError) {
      this.db.handleSupabaseError('getFriends', profilesError, { userId });
    }

    // Map friendships with profiles
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const friends: FriendWithProfile[] = friendships
      .map((friendship) => {
        const profile = profileMap.get(friendship.friend_id);
        if (!profile) return null;
        return {
          id: friendship.id,
          friend_id: friendship.friend_id,
          username: profile.username,
          email: profile.email,
          avatar_url: profile.avatar_url,
          created_at: new Date(friendship.created_at),
        };
      })
      .filter((f): f is FriendWithProfile => f !== null);

    this.logger.debug('Friends retrieved successfully', {
      userId,
      count: friends.length,
    });

    return friends;
  }

  /**
   * Get pending friend requests for a user (both sent and received)
   */
  async getFriendRequests(userId: string): Promise<{
    received: FriendRequestWithProfile[];
    sent: FriendRequestWithProfile[];
  }> {
    this.logger.debug('Getting friend requests', { userId });

    // Get received requests
    const { data: receivedRequests, error: receivedError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('addressee_id', userId)
      .eq('status', FriendRequestStatus.PENDING)
      .order('created_at', { ascending: false });

    if (receivedError) {
      this.db.handleSupabaseError('getFriendRequests', receivedError, { userId });
    }

    // Get sent requests
    const { data: sentRequests, error: sentError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', FriendRequestStatus.PENDING)
      .order('created_at', { ascending: false });

    if (sentError) {
      this.db.handleSupabaseError('getFriendRequests', sentError, { userId });
    }

    // Get profiles for received requests
    const requesterIds = receivedRequests?.map((r) => r.requester_id) || [];
    const { data: requesterProfiles } = requesterIds.length > 0
      ? await this.db.supabaseAdmin
          .from('user_profiles')
          .select('id, username, email, avatar_url')
          .in('id', requesterIds)
      : { data: [] };

    // Get profiles for sent requests
    const addresseeIds = sentRequests?.map((r) => r.addressee_id) || [];
    const { data: addresseeProfiles } = addresseeIds.length > 0
      ? await this.db.supabaseAdmin
          .from('user_profiles')
          .select('id, username, email, avatar_url')
          .in('id', addresseeIds)
      : { data: [] };

    type Profile = { id: string; username: string; email: string; avatar_url: string };
    const requesterMap = new Map<string, Profile>(
      (requesterProfiles as Profile[])?.map((p) => [p.id, p]) || []
    );
    const addresseeMap = new Map<string, Profile>(
      (addresseeProfiles as Profile[])?.map((p) => [p.id, p]) || []
    );

    const received: FriendRequestWithProfile[] =
      receivedRequests?.map((req) => {
        const profile = requesterMap.get(req.requester_id);
        if (!profile) return null;
        return {
          id: req.id,
          requester_id: req.requester_id,
          addressee_id: req.addressee_id,
          status: req.status,
          username: profile.username,
          email: profile.email,
          avatar_url: profile.avatar_url,
          created_at: new Date(req.created_at),
          updated_at: new Date(req.updated_at),
        };
      }).filter((r): r is FriendRequestWithProfile => r !== null) || [];

    const sent: FriendRequestWithProfile[] =
      sentRequests?.map((req) => {
        const profile = addresseeMap.get(req.addressee_id);
        if (!profile) return null;
        return {
          id: req.id,
          requester_id: req.requester_id,
          addressee_id: req.addressee_id,
          status: req.status,
          username: profile.username,
          email: profile.email,
          avatar_url: profile.avatar_url,
          created_at: new Date(req.created_at),
          updated_at: new Date(req.updated_at),
        };
      }).filter((r): r is FriendRequestWithProfile => r !== null) || [];

    this.logger.debug('Friend requests retrieved successfully', {
      userId,
      receivedCount: received.length,
      sentCount: sent.length,
    });

    return { received, sent };
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    this.logger.debug('Removing friend', { userId, friendId });

    // Remove bidirectional friendship
    const { error: error1 } = await this.db.supabaseAdmin
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);

    const { error: error2 } = await this.db.supabaseAdmin
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId);

    const error = error1 || error2;

    if (error) {
      this.db.handleSupabaseError('removeFriend', error, { userId, friendId });
    }

    this.logger.log('Friend removed successfully', { userId, friendId });
  }

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(userId: string, requestId: string): Promise<void> {
    this.logger.debug('Canceling friend request', { userId, requestId });

    const { data: request, error: requestError } = await this.db.supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('requester_id', userId)
      .eq('status', FriendRequestStatus.PENDING)
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Friend request not found or already processed');
    }

    const { error } = await this.db.supabaseAdmin.from('friend_requests').delete().eq('id', requestId);

    if (error) {
      this.db.handleSupabaseError('cancelFriendRequest', error, { requestId });
    }

    this.logger.log('Friend request canceled successfully', { userId, requestId });
  }
}

