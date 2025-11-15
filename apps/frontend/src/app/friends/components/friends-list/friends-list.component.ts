import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FriendsService } from '../../services/friends.service';
import { FriendWithProfile } from '@gamebox/shared';

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './friends-list.component.html',
  styleUrl: './friends-list.component.scss',
})
export class FriendsListComponent implements OnInit {
  private friendsService = inject(FriendsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly friends = signal<FriendWithProfile[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.loadFriends();
  }

  loadFriends(): void {
    this.isLoading.set(true);
    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        this.friends.set(friends);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.snackBar.open('Error loading friends', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  removeFriend(friendId: string, friendUsername: string): void {
    if (confirm(`Are you sure you want to remove ${friendUsername} from your friends?`)) {
      this.friendsService.removeFriend(friendId).subscribe({
        next: () => {
          this.snackBar.open('Friend removed', 'Close', { duration: 3000 });
          this.loadFriends();
        },
        error: (error) => {
          console.error('Error removing friend:', error);
          this.snackBar.open('Error removing friend', 'Close', { duration: 3000 });
        },
      });
    }
  }
}

