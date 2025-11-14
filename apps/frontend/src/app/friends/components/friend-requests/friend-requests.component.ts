import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { FriendsService } from '../../services/friends.service';
import { FriendRequestWithProfile } from '@gamebox/shared';

@Component({
  selector: 'app-friend-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './friend-requests.component.html',
  styleUrl: './friend-requests.component.scss',
})
export class FriendRequestsComponent implements OnInit {
  private friendsService = inject(FriendsService);
  private snackBar = inject(MatSnackBar);

  readonly receivedRequests = signal<FriendRequestWithProfile[]>([]);
  readonly sentRequests = signal<FriendRequestWithProfile[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.loadFriendRequests();
  }

  loadFriendRequests(): void {
    this.isLoading.set(true);
    this.friendsService.getFriendRequests().subscribe({
      next: (requests) => {
        this.receivedRequests.set(requests.received);
        this.sentRequests.set(requests.sent);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading friend requests:', error);
        this.snackBar.open('Error loading friend requests', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  acceptRequest(requestId: string): void {
    this.friendsService.acceptFriendRequest(requestId).subscribe({
      next: () => {
        this.snackBar.open('Friend request accepted!', 'Close', { duration: 3000 });
        this.loadFriendRequests();
      },
      error: (error) => {
        console.error('Error accepting friend request:', error);
        this.snackBar.open('Error accepting friend request', 'Close', { duration: 3000 });
      },
    });
  }

  rejectRequest(requestId: string): void {
    this.friendsService.rejectFriendRequest(requestId).subscribe({
      next: () => {
        this.snackBar.open('Friend request rejected', 'Close', { duration: 3000 });
        this.loadFriendRequests();
      },
      error: (error) => {
        console.error('Error rejecting friend request:', error);
        this.snackBar.open('Error rejecting friend request', 'Close', { duration: 3000 });
      },
    });
  }

  cancelRequest(requestId: string): void {
    this.friendsService.cancelFriendRequest(requestId).subscribe({
      next: () => {
        this.snackBar.open('Friend request canceled', 'Close', { duration: 3000 });
        this.loadFriendRequests();
      },
      error: (error) => {
        console.error('Error canceling friend request:', error);
        this.snackBar.open('Error canceling friend request', 'Close', { duration: 3000 });
      },
    });
  }
}

