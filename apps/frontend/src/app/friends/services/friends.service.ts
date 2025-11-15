import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FriendRequestWithProfile,
  FriendWithProfile,
  SearchUserResult,
} from '@gamebox/shared';
import { HttpService } from '../../shared/services/http.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private httpService = inject(HttpService);
  private backendUrl = environment.backendUrl;

  /**
   * Search for users by username or email
   */
  searchUsers(query: string, limit = 10): Observable<SearchUserResult[]> {
    return this.httpService.get<SearchUserResult[]>(
      `${this.backendUrl}/friends/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Send a friend request to a user
   */
  sendFriendRequest(userId: string): Observable<{ success: boolean; message: string }> {
    return this.httpService.post<{ success: boolean; message: string }>(
      `${this.backendUrl}/friends/requests/${userId}`,
      {}
    );
  }

  /**
   * Accept a friend request
   */
  acceptFriendRequest(requestId: string): Observable<FriendWithProfile> {
    return this.httpService.post<FriendWithProfile>(
      `${this.backendUrl}/friends/requests/${requestId}/accept`,
      {}
    );
  }

  /**
   * Reject a friend request
   */
  rejectFriendRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.httpService.post<{ success: boolean; message: string }>(
      `${this.backendUrl}/friends/requests/${requestId}/reject`,
      {}
    );
  }

  /**
   * Cancel a sent friend request
   */
  cancelFriendRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.httpService.delete<{ success: boolean; message: string }>(
      `${this.backendUrl}/friends/requests/${requestId}`
    );
  }

  /**
   * Get all friends
   */
  getFriends(): Observable<FriendWithProfile[]> {
    return this.httpService.get<FriendWithProfile[]>(`${this.backendUrl}/friends`);
  }

  /**
   * Get friend requests (both sent and received)
   */
  getFriendRequests(): Observable<{
    received: FriendRequestWithProfile[];
    sent: FriendRequestWithProfile[];
  }> {
    return this.httpService.get<{
      received: FriendRequestWithProfile[];
      sent: FriendRequestWithProfile[];
    }>(`${this.backendUrl}/friends/requests`);
  }

  /**
   * Remove a friend
   */
  removeFriend(friendId: string): Observable<{ success: boolean; message: string }> {
    return this.httpService.delete<{ success: boolean; message: string }>(
      `${this.backendUrl}/friends/${friendId}`
    );
  }
}

