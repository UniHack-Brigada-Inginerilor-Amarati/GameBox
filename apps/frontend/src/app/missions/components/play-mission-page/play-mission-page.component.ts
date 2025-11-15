import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Observable,
  map,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
} from 'rxjs';
import { Mission, UserProfile, RichTextUtils, RichTextDescription } from '@gamebox/shared';
import { MissionService } from '../../services/mission.service';
import { SessionService } from '../../services/session.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ProfileService } from '../../../profile/services/profile.service';

@Component({
  selector: 'app-play-mission-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatDialogModule,
  ],
  templateUrl: './play-mission-page.component.html',
  styleUrls: ['./play-mission-page.component.scss'],
})
export class PlayMissionPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private missionService = inject(MissionService);
  private sessionService = inject(SessionService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);

  mission: Mission | null = null;
  searchControl = new FormControl('');
  selectedPlayers: UserProfile[] = [];
  filteredUsers$: Observable<UserProfile[]>;
  loading = false;
  creatingSession = false;

  constructor() {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query || query.length < 2) {
          return of([]);
        }
        return this.userService.searchUsers(query).pipe(
          catchError((error) => {
            console.error('Error searching users:', error);
            this.snackBar.open('Error searching users', 'Close', {
              duration: 3000,
            });
            return of([]);
          }),
        );
      }),
      map((users) => {
        console.log('Received users from search:', users);
        if (!users || !Array.isArray(users)) {
          console.warn('Invalid users data:', users);
          return [];
        }
        const filtered = users.filter((user) => {
          const hasId = user && user.id;
          if (!hasId) {
            console.warn('User missing id field:', user);
          }
          return hasId && !this.selectedPlayers.some((selected) => selected.id === user.id);
        });
        console.log('Filtered users:', filtered);
        return filtered;
      }),
      catchError((error) => {
        console.error('Error in filteredUsers$ stream:', error);
        return of([]);
      }),
    );
  }

  ngOnInit(): void {
    const missionSlug = this.route.snapshot.paramMap.get('slug');
    if (missionSlug) {
      this.loadMission(missionSlug);
    } else {
      this.router.navigate(['/missions']);
    }
  }

  private loadMission(missionSlug: string): void {
    this.loading = true;
    this.missionService.getMissionBySlug(missionSlug).subscribe({
      next: (mission: Mission) => {
        this.mission = mission;
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading mission:', error);
        this.snackBar.open('Error loading mission', 'Close', {
          duration: 3000,
        });
        this.loading = false;
        this.router.navigate(['/missions']);
      },
    });
  }

  onUserSelected(user: UserProfile): void {
    if (!this.selectedPlayers.some((player) => player.id === user.id)) {
      this.selectedPlayers.push(user);
      this.searchControl.setValue('');
    }
  }

  removePlayer(player: UserProfile): void {
    this.selectedPlayers = this.selectedPlayers.filter((p) => p.id !== player.id);
  }

  canStartMission(): boolean {
    return this.selectedPlayers.length >= 2 && !this.creatingSession;
  }

  startMission(): void {
    if (!this.mission || !this.canStartMission()) {
      return;
    }

    if (!this.mission?.slug) {
      this.snackBar.open('Mission information is missing', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.creatingSession = true;

    // Get the current user's profile to get their username
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        if (!profile || !profile.username) {
          this.snackBar.open('Unable to get user profile', 'Close', {
            duration: 3000,
          });
          this.creatingSession = false;
          return;
        }

        this.sessionService.createSession(this.mission!.slug, profile.username).subscribe({
          next: (session) => {
            const playerNames = this.selectedPlayers.map((player) => player.username);
            this.sessionService.addSessionPlayers(session.session_id, playerNames).subscribe({
              next: () => {
                this.sessionService.startSession(session.session_id).subscribe({
                  next: (startedSession) => {
                    this.router.navigate(
                      ['/missions', this.mission?.slug || '', 'play', session.session_id],
                      {
                        state: {
                          session: startedSession,
                          players: this.selectedPlayers,
                          mission: this.mission,
                        },
                      },
                    );
                  },
                  error: (error) => {
                    console.error('Error starting session:', error);
                    this.handleError(error, 'Error starting session');
                    this.creatingSession = false;
                  },
                });
              },
              error: (error) => {
                console.error('Error adding players to session:', error);
                this.handleError(error, 'Error adding players to session');
                this.creatingSession = false;
              },
            });
          },
          error: (error) => {
            console.error('Error creating session:', error);
            this.handleError(error, 'Error creating session');
            this.creatingSession = false;
          },
        });
      },
      error: (error: unknown) => {
        console.error('Error getting current user:', error);
        this.handleError(error, 'Error getting user information');
        this.creatingSession = false;
      },
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    if (error?.status === 401) {
      // Authentication failed - check if user is truly not authenticated
      this.authService.getCurrentUser().subscribe({
        next: ({ user }) => {
          let message: string;
          if (!user) {
            // User is not authenticated, redirect to home
            message = 'Your session has expired. Please log in again.';
            this.snackBar.open(message, 'Close', {
              duration: 5000,
            });
            this.router.navigate(['/']);
          } else {
            // User is authenticated but token might be invalid/expired
            message = 'Authentication failed. Please try refreshing the page.';
            this.snackBar.open(message, 'Close', {
              duration: 5000,
            });
          }
        },
        error: () => {
          // Can't verify user, assume not authenticated
          const message = 'Your session has expired. Please log in again.';
          this.snackBar.open(message, 'Close', {
            duration: 5000,
          });
          this.router.navigate(['/']);
        },
      });
      return;
    }

    // Handle other error types
    let message = defaultMessage;
    if (error?.status === 403) {
      message = 'You do not have permission to perform this action. Admin or moderator role required.';
    } else if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.message) {
      message = error.message;
    }

    this.snackBar.open(message, 'Close', {
      duration: 5000,
    });
  }

  goBack(): void {
    this.router.navigate(['/missions']);
  }

  getDescriptionText(description: string | RichTextDescription): string {
    return RichTextUtils.getDescriptionText(description);
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }
}
