import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Mission, Game, RichTextUtils, RichTextDescription } from '@gamebox/shared';
import { MissionService, MissionPlayer } from '../../services/mission.service';
import { GameCardComponent } from '../../../games/components/game-card/game-card.component';


@Component({
  selector: 'app-mission-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule,
    FormsModule,
    GameCardComponent,
  ],
  templateUrl: './mission-page.component.html',
  styleUrl: './mission-page.component.scss',
})
export class MissionPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private missionService = inject(MissionService);
  private snackBar = inject(MatSnackBar);

  mission: Mission | null = null;
  players: MissionPlayer[] = [];
  isLoading = true;
  isLoadingPlayers = false;
  missionSlug: string | null = null;
  
  displayedColumns: string[] = ['player', 'score', 'joined', 'actions'];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.missionSlug = params['slug'];
      this.loadMission();
    });
  }

  loadMission(): void {
    if (!this.missionSlug) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.missionService.getMissionBySlug(this.missionSlug).subscribe({
      next: (mission: Mission) => {
        this.mission = mission;
        this.isLoading = false;
        this.loadPlayers();
      },
      error: (error: unknown) => {
        console.error('Error loading mission:', error);
        this.mission = null;
        this.isLoading = false;
      }
    });
  }

  loadPlayers(): void {
    if (!this.missionSlug) {
      return;
    }

    this.isLoadingPlayers = true;
    this.missionService.getMissionPlayers(this.missionSlug).subscribe({
      next: (players: MissionPlayer[]) => {
        this.players = players;
        this.isLoadingPlayers = false;
      },
      error: (error: unknown) => {
        console.error('Error loading mission players:', error);
        this.players = [];
        this.isLoadingPlayers = false;
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getDescriptionText(description: string | RichTextDescription): string {
    return RichTextUtils.getDescriptionText(description);
  }

  getGameForCard(game: Game | undefined, category: string): (Game & { category: string }) | null {
    if (!game) {
      return null;
    }
  
    return {
      ...game,
      category: category
    } as Game & { category: string };
  }

  goBack(): void {
    this.router.navigate(['/missions']);
  }

  updateScore(playerId: string, score: number | null): void {
    if (!this.missionSlug) {
      return;
    }

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

    this.missionService.updatePlayerScore(this.missionSlug, playerId, score).subscribe({
      next: (updatedPlayer) => {
        // Update the player in the local array
        const playerIndex = this.players.findIndex((p) => p.player_id === playerId);
        if (playerIndex !== -1) {
          this.players[playerIndex] = updatedPlayer;
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

  clearScore(playerId: string): void {
    this.updateScore(playerId, null);
  }

  parseInteger(value: string): number | null {
    if (!value || value.trim() === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
}
