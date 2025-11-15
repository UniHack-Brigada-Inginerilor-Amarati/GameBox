import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Game, UserProfile, Session, PlayerGameResult } from '@gamebox/shared';
import { SessionService } from '../../../../services/session.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-current-game',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './current-game.component.html',
  styleUrls: ['./current-game.component.scss']
})
export class CurrentGameComponent {
  @Input({ required: true }) currentGame!: Game | null;
  @Input({ required: true }) currentGameIndex!: number;
  @Input({ required: true }) totalGames!: number;
  @Input({ required: true }) gameCompleted!: boolean;
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) isLastGame!: boolean;
  @Input({ required: true }) missionCompleted!: boolean;
  @Input({ required: true }) gameOrder!: string[];
  @Input({ required: true }) gameplayData!: { session: Session; players: UserProfile[]; };
  @Input({ required: true }) gameResults!: PlayerGameResult[];

  @Output() gameResultsUpdated = new EventEmitter<PlayerGameResult[]>();
  @Output() gameCompletedUpdate = new EventEmitter<boolean>();
  @Output() loadingUpdate = new EventEmitter<boolean>();
  @Output() missionCompletedUpdate = new EventEmitter<boolean>();
  @Output() currentGameIndexUpdate = new EventEmitter<number>();

  private sessionService = inject(SessionService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  onPlayCurrentGame(): void {
    if (!this.currentGame) return;

    this.loadingUpdate.emit(true);
    setTimeout(() => {
      this.completeCurrentGame();
    }, 2000);
  }

  private completeCurrentGame(): void {
    if (!this.currentGame || !this.gameplayData) {
      console.error('Current game or gameplay data is not available');
      return;
    }

    // Game results are already created when the session was created
    // Player results are already created when players were added
    // We just need to mark the game as completed and reload results
    this.gameCompletedUpdate.emit(true);
    this.loadingUpdate.emit(false);
    
    // Emit empty array to trigger parent reload of game results
    this.gameResultsUpdated.emit([]);

    this.snackBar.open(
      `Game "${this.currentGame?.name || 'Unknown'}" completed!`,
      'Close',
      {
        duration: 3000,
      }
    );
  }

  onNextGame(): void {
    if (this.isLastGame) {
      this.completeMission();
    } else {
      this.currentGameIndexUpdate.emit(this.currentGameIndex + 1);
      this.gameCompletedUpdate.emit(false);
    }
  }

  private completeMission(): void {
    if (!this.gameplayData) return;

    this.loadingUpdate.emit(true);

    this.sessionService
      .endSession(this.gameplayData.session.session_id)
      .subscribe({
        next: () => {
          this.missionCompletedUpdate.emit(true);
          this.loadingUpdate.emit(false);

          this.snackBar.open('Mission completed successfully!', 'Close', {
            duration: 5000,
          });
        },
        error: (error: unknown) => {
          console.error('Error ending session:', error);
          this.snackBar.open('Error completing mission', 'Close', {
            duration: 3000,
          });
          this.loadingUpdate.emit(false);
        },
      });
  }

  onRestartMission(): void {
    this.currentGameIndexUpdate.emit(0);
    this.gameCompletedUpdate.emit(false);
    this.missionCompletedUpdate.emit(false);
    this.gameResultsUpdated.emit([]);
  }

  onGoBack(): void {
    this.router.navigate(['/missions']);
  }

  getAbilityIcon(ability: string): string {
    const icons: { [key: string]: string } = {
      mentalFortitudeComposure: '🧠',
      adaptabilityDecisionMaking: '🔄',
      aimMechanicalSkill: '🎯',
      gameSenseAwareness: '👁️',
      teamworkCommunication: '💬',
      strategy: '🧩',
    };
    return icons[ability] || '🎮';
  }

  getAbilityName(ability: string): string {
    const names: { [key: string]: string } = {
      mentalFortitudeComposure: 'Mental Fortitude / Composure',
      adaptabilityDecisionMaking: 'Adaptability / Decision Making',
      aimMechanicalSkill: 'Aim / Mechanical Skill',
      gameSenseAwareness: 'Game Sense / Awareness',
      teamworkCommunication: 'Teamwork / Communication',
      strategy: 'Strategy',
    };
    return names[ability] || ability;
  }
}
