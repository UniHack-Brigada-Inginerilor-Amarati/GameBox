import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FriendsService } from '../../services/friends.service';
import { SearchUserResult } from '@gamebox/shared';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-search.component.html',
  styleUrl: './user-search.component.scss',
})
export class UserSearchComponent {
  private friendsService = inject(FriendsService);
  private snackBar = inject(MatSnackBar);

  readonly searchQuery = signal('');
  readonly searchResults = signal<SearchUserResult[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);

  private searchSubject = new Subject<string>();

  constructor() {
    // Debounce search input
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.isSearching.set(true);
          this.hasSearched.set(true);
          return this.friendsService.searchUsers(query, 20);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
        },
        error: (error) => {
          console.error('Search error:', error);
          this.snackBar.open('Error searching users', 'Close', { duration: 3000 });
          this.isSearching.set(false);
        },
      });
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim();
    this.searchQuery.set(query);

    if (query.length >= 2) {
      this.searchSubject.next(query);
    } else {
      this.searchResults.set([]);
      this.hasSearched.set(false);
    }
  }

  sendFriendRequest(userId: string): void {
    this.friendsService.sendFriendRequest(userId).subscribe({
      next: () => {
        this.snackBar.open('Friend request sent!', 'Close', { duration: 3000 });
        // Update the user's status in results
        this.updateUserStatus(userId, true, true);
      },
      error: (error) => {
        console.error('Error sending friend request:', error);
        this.snackBar.open(
          error.error?.message || 'Error sending friend request',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  private updateUserStatus(
    userId: string,
    hasPendingRequest: boolean,
    requestSentByMe: boolean
  ): void {
    const results = this.searchResults();
    const updated = results.map((user) =>
      user.id === userId
        ? { ...user, has_pending_request: hasPendingRequest, request_sent_by_me: requestSentByMe }
        : user
    );
    this.searchResults.set(updated);
  }
}

