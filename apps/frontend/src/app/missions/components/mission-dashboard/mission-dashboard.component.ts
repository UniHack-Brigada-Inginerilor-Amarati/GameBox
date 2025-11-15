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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Mission, AdminRoles } from '@gamebox/shared';
import { MissionService, MissionPlayer } from '../../services/mission.service';
import { MissionCardComponent } from '../mission-card/mission-card.component';
import { ProfileService } from '../../../profile/services/profile.service';
import { ConfirmCompleteMissionDialogComponent } from './confirm-complete-mission-dialog.component';

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
    MatDialogModule,
    MatTooltipModule,
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
  displayedColumns: string[] = [
    'player',
    'mental_fortitude_composure_score',
    'adaptability_decision_making_score',
    'aim_mechanical_skill_score',
    'game_sense_awareness_score',
    'teamwork_communication_score',
    'strategy_score',
    'state',
    'score',
    'actions',
  ];
  isAdmin = false;

  private missionService: MissionService = inject(MissionService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private router: Router = inject(Router);
  private profileService: ProfileService = inject(ProfileService);
  private dialog: MatDialog = inject(MatDialog);
  private completingMissions = new Set<string>();

  ngOnInit(): void {
    this.checkAdminStatus();
    this.loadMissions();
  }

  private checkAdminStatus(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.isAdmin = AdminRoles.includes(profile.role);
        console.log('Admin status checked:', { isAdmin: this.isAdmin, role: profile.role });
      },
      error: (error) => {
        this.isAdmin = false;
        console.error('Error checking admin status:', error);
      },
    });
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

    // Debug: Log mission games
    this.missions.forEach((mission) => {
      console.log('Mission:', mission.name, {
        games: {
          mental: mission.games?.mentalFortitudeComposure?.slug || mission.games?.mentalFortitudeComposure?.name,
          adaptability: mission.games?.adaptabilityDecisionMaking?.slug || mission.games?.adaptabilityDecisionMaking?.name,
          aim: mission.games?.aimMechanicalSkill?.slug || mission.games?.aimMechanicalSkill?.name,
          gameSense: mission.games?.gameSenseAwareness?.slug || mission.games?.gameSenseAwareness?.name,
          teamwork: mission.games?.teamworkCommunication?.slug || mission.games?.teamworkCommunication?.name,
          strategy: mission.games?.strategy?.slug || mission.games?.strategy?.name,
        },
        hasLoL: this.hasLeagueOfLegends(mission),
      });
    });

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

    // Only update local state - don't save to database until "Complete Mission" is pressed
    const missionWithPlayers = this.missionsWithPlayers.find(
      (m) => m.mission.slug === missionSlug,
    );
    if (missionWithPlayers) {
      const playerIndex = missionWithPlayers.players.findIndex(
        (p) => p.player_id === playerId,
      );
      if (playerIndex !== -1) {
        missionWithPlayers.players[playerIndex].score = score;
      }
    }
  }

  clearScore(missionSlug: string, playerId: string): void {
    this.updateScore(missionSlug, playerId, null);
  }

  updateAbilityScore(
    missionSlug: string,
    playerId: string,
    abilityName: 'mental_fortitude_composure_score' | 'adaptability_decision_making_score' | 'aim_mechanical_skill_score' | 'game_sense_awareness_score' | 'teamwork_communication_score' | 'strategy_score',
    score: number | null,
  ): void {
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

    // Only update local state - don't save to database until "Complete Mission" is pressed
    const missionWithPlayers = this.missionsWithPlayers.find(
      (m) => m.mission.slug === missionSlug,
    );
    if (missionWithPlayers) {
      const playerIndex = missionWithPlayers.players.findIndex(
        (p) => p.player_id === playerId,
      );
      if (playerIndex !== -1) {
        missionWithPlayers.players[playerIndex][abilityName] = score;
      }
    }
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

  /**
   * Check if a mission has League of Legends as one of its games
   */
  hasLeagueOfLegends(mission: Mission): boolean {
    if (!mission?.games) {
      return false;
    }

    // Check all game slots for League of Legends
    // Check both slug and name to be more flexible
    const lolIdentifiers = ['league-of-legends', 'league of legends', 'lol', 'league'];
    const games = [
      mission.games.mentalFortitudeComposure,
      mission.games.adaptabilityDecisionMaking,
      mission.games.aimMechanicalSkill,
      mission.games.gameSenseAwareness,
      mission.games.teamworkCommunication,
      mission.games.strategy,
    ].filter(Boolean); // Remove undefined values

    const hasLoL = games.some((game) => {
      if (!game) return false;
      const slug = game.slug?.toLowerCase() || '';
      const name = game.name?.toLowerCase() || '';
      return lolIdentifiers.some((identifier) => 
        slug.includes(identifier) || name.includes(identifier)
      );
    });

    // Debug logging
    if (hasLoL) {
      console.log('League of Legends detected in mission:', mission.name, {
        games: games.map(g => ({ slug: g?.slug, name: g?.name })),
        isAdmin: this.isAdmin,
      });
    }

    return hasLoL;
  }

  /**
   * Calculate League score for a player using Gemini AI
   */
  calculateLeagueScore(missionSlug: string, playerId: string): void {
    const missionWithPlayers = this.missionsWithPlayers.find(
      (m) => m.mission.slug === missionSlug,
    );

    if (!missionWithPlayers) {
      return;
    }

    const player = missionWithPlayers.players.find((p) => p.player_id === playerId);
    if (!player) {
      return;
    }

    const loadingKey = `${missionSlug}-${playerId}`;
    this.isCalculatingLeagueScore.add(loadingKey);

    // Show loading state
    this.snackBar.open('Calculating League of Legends score with AI...', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });

    this.missionService.calculateLeagueScoreForPlayer(missionSlug, playerId).subscribe({
      next: (updatedPlayer) => {
        // Update the player in the local array
        const playerIndex = missionWithPlayers.players.findIndex(
          (p) => p.player_id === playerId,
        );
        if (playerIndex !== -1) {
          missionWithPlayers.players[playerIndex] = updatedPlayer;
        }
        this.isCalculatingLeagueScore.delete(loadingKey);
        this.snackBar.open('League score calculated and updated successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
      error: (error) => {
        console.error('Error calculating League score:', error);
        this.isCalculatingLeagueScore.delete(loadingKey);
        const errorMessage =
          error.error?.message || 'Failed to calculate League score. Make sure the player has a Riot username configured and has played a recent match.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
  }

  isCalculatingLeagueScore = new Set<string>();

  isCalculatingLeagueScoreForPlayer(missionSlug: string, playerId: string): boolean {
    return this.isCalculatingLeagueScore.has(`${missionSlug}-${playerId}`);
  }

  onPlayMission(mission: Mission): void {
    // Reload missions to update the hasJoined status after playing
    this.loadMissions();
  }

  isMissionCompleted(players: MissionPlayer[]): boolean {
    if (players.length === 0) return false;
    return players.every((player) => player.state === 'completed');
  }

  isCompletingMission(missionSlug: string): boolean {
    return this.completingMissions.has(missionSlug);
  }

  completeMission(missionSlug: string, players: MissionPlayer[]): void {
    // Show confirmation dialog
    const dialogRef = this.dialog.open(ConfirmCompleteMissionDialogComponent, {
      width: '400px',
      data: {
        missionName: this.missions.find((m) => m.slug === missionSlug)?.name || 'this mission',
        playerCount: players.length,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      // Collect all current scores from the players array
      const playerScores = players.map((player) => ({
        playerId: player.player_id,
        score: player.score,
        mental_fortitude_composure_score: player.mental_fortitude_composure_score,
        adaptability_decision_making_score: player.adaptability_decision_making_score,
        aim_mechanical_skill_score: player.aim_mechanical_skill_score,
        game_sense_awareness_score: player.game_sense_awareness_score,
        teamwork_communication_score: player.teamwork_communication_score,
        strategy_score: player.strategy_score,
      }));

      this.completingMissions.add(missionSlug);

      this.missionService.completeMission(missionSlug, playerScores).subscribe({
        next: (updatedPlayers) => {
          // Update the players in the local array
          const missionWithPlayers = this.missionsWithPlayers.find(
            (m) => m.mission.slug === missionSlug,
          );
          if (missionWithPlayers) {
            missionWithPlayers.players = updatedPlayers;
          }

          this.completingMissions.delete(missionSlug);

          this.snackBar.open('Mission completed successfully!', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
        },
        error: (error) => {
          console.error('Error completing mission:', error);
          this.completingMissions.delete(missionSlug);
          this.snackBar.open('Failed to complete mission', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
        },
      });
    });
  }
}
