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
import { Observable, map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { Mission, UserProfile, RichTextUtils, RichTextDescription } from '@gamebox/shared';
import { MissionService } from '../../services/mission.service';
import { SessionService } from '../../services/session.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';

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
          return new Observable<UserProfile[]>((subscriber) => {
            subscriber.next([]);
            subscriber.complete();
          });
        }
        return this.userService.searchUsers(query);
      }),
      map((users) => {
        const filtered = users.filter(
          (user) => !this.selectedPlayers.some((selected) => selected.id === user.id),
        );
        return filtered;
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

    this.creatingSession = true;

    this.authService.getCurrentUser().subscribe({
      next: ({ user }: { user: unknown }) => {
        if (!user) {
          this.snackBar.open('You must be logged in to start a mission', 'Close', {
            duration: 3000,
          });
          this.creatingSession = false;
          return;
        }

        const userObj = user as { id: string };
        this.sessionService.createSession(this.mission?.slug || '', userObj.id).subscribe({
          next: (session) => {
            const playerIds = this.selectedPlayers.map((player) => player.id);
            this.sessionService.addSessionPlayers(session.session_id, playerIds).subscribe({
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
                    this.snackBar.open('Error starting session', 'Close', {
                      duration: 3000,
                    });
                    this.creatingSession = false;
                  },
                });
              },
              error: (error) => {
                console.error('Error adding players to session:', error);
                this.snackBar.open('Error adding players to session', 'Close', {
                  duration: 3000,
                });
                this.creatingSession = false;
              },
            });
          },
          error: (error) => {
            console.error('Error creating session:', error);
            this.snackBar.open('Error creating session', 'Close', {
              duration: 3000,
            });
            this.creatingSession = false;
          },
        });
      },
      error: (error: unknown) => {
        console.error('Error getting current user:', error);
        this.snackBar.open('Error getting user information', 'Close', {
          duration: 3000,
        });
        this.creatingSession = false;
      },
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
