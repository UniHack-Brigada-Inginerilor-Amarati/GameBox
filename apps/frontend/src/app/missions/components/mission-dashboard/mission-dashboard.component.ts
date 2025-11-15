import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { Mission } from '@gamebox/shared';
import { MissionService, MissionPlayer } from '../../services/mission.service';
import { MissionCardComponent } from '../mission-card/mission-card.component';

interface MissionWithPlayers {
  mission: Mission;
  players: MissionPlayer[];
  loading: boolean;
}

@Component({
  selector: 'app-mission-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    FormsModule,
    MissionCardComponent,
  ],
  templateUrl: './mission-dashboard.component.html',
  styleUrl: './mission-dashboard.component.scss',
})
export class MissionDashboardComponent implements OnInit {
  missions: Mission[] = [];
  missionsWithPlayers: MissionWithPlayers[] = [];
  loading = false;
  loadingPlayers = false;
  error: string | null = null;
  displayedColumns: string[] = ['player', 'score', 'actions'];

  private missionService: MissionService = inject(MissionService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private router: Router = inject(Router);

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;
    this.error = null;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.loading = false;
        this.loadPlayersForAllMissions();
      },
      error: (error) => {
        this.error = 'Failed to load missions. Please try again later.';
        this.loading = false;
        this.snackBar.open(this.error, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
  }

  loadPlayersForAllMissions(): void {
    this.loadingPlayers = true;
    this.missionsWithPlayers = this.missions.map((mission) => ({
      mission,
      players: [],
      loading: true,
    }));

    // Load players for each mission
    this.missions.forEach((mission, index) => {
      this.missionService.getMissionPlayers(mission.slug).subscribe({
        next: (players) => {
          if (this.missionsWithPlayers[index]) {
            this.missionsWithPlayers[index].players = players;
            this.missionsWithPlayers[index].loading = false;
          }
          // Check if all missions have finished loading
          if (this.missionsWithPlayers.every((m) => !m.loading)) {
            this.loadingPlayers = false;
          }
        },
        error: (error) => {
          console.error(`Error loading players for mission ${mission.slug}:`, error);
          if (this.missionsWithPlayers[index]) {
            this.missionsWithPlayers[index].players = [];
            this.missionsWithPlayers[index].loading = false;
          }
          // Check if all missions have finished loading
          if (this.missionsWithPlayers.every((m) => !m.loading)) {
            this.loadingPlayers = false;
          }
        },
      });
    });
  }

  updateScore(missionSlug: string, playerId: string, score: number | null): void {
    // Validate score if provided - must be a non-negative integer
    if (score !== null) {
      const integerScore = Math.floor(score);
      if (isNaN(integerScore) || integerScore < 0 || integerScore !== score) {
        this.snackBar.open('Score must be a non-negative integer', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        return;
      }
      score = integerScore;
    }

    this.missionService.updatePlayerScore(missionSlug, playerId, score).subscribe({
      next: (updatedPlayer) => {
        // Update the player in the local array
        const missionWithPlayers = this.missionsWithPlayers.find(
          (m) => m.mission.slug === missionSlug,
        );
        if (missionWithPlayers) {
          const playerIndex = missionWithPlayers.players.findIndex(
            (p) => p.player_id === playerId,
          );
          if (playerIndex !== -1) {
            missionWithPlayers.players[playerIndex] = updatedPlayer;
          }
        }
        this.snackBar.open('Score updated successfully', 'Close', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
      error: (error) => {
        console.error('Error updating score:', error);
        this.snackBar.open('Failed to update score', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
  }

  clearScore(missionSlug: string, playerId: string): void {
    this.updateScore(missionSlug, playerId, null);
  }

  parseInteger(value: string): number | null {
    if (!value || value.trim() === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  trackByMissionSlug(index: number, mission: Mission): string {
    return mission.slug;
  }

  onPlayMission(mission: Mission): void {
    // Reload missions to update the hasJoined status after playing
    this.loadMissions();
  }
}
