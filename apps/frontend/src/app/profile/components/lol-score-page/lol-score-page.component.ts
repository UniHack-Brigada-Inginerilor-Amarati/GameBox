import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { GameScore } from '@gamebox/shared';

@Component({
  selector: 'app-lol-score-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './lol-score-page.component.html',
  styleUrl: './lol-score-page.component.scss',
})
export class LolScorePageComponent implements OnInit {
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);

  readonly score = signal<GameScore | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly abilities: Array<keyof GameScore> = [
    'mentalFortitudeComposure',
    'adaptabilityDecisionMaking',
    'aimMechanicalSkill',
    'gameSenseAwareness',
    'teamworkCommunication',
    'strategy',
  ];

  ngOnInit(): void {
    this.loadScore();
  }

  loadScore(region: string = 'europe'): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.profileService.getLeagueScore(region).subscribe({
      next: (gameScore: GameScore) => {
        this.score.set(gameScore);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        let errorMessage = 'Failed to load League score';

        if (err.status === 400) {
          errorMessage = err.error?.message || 'Invalid request. Please check your Riot username in your profile.';
        } else if (err.status === 404) {
          errorMessage = err.error?.message || 'No League of Legends matches found.';
        } else if (err.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else {
          errorMessage = err.error?.message || 'An error occurred while loading your score.';
        }

        this.error.set(errorMessage);
        this.showErrorMessage(errorMessage);
        console.error('League score loading error:', err);
      },
    });
  }

  refreshScore(): void {
    this.loadScore();
  }

  getScoreColor(score: number | undefined): string {
    if (score === undefined || score === null) return 'gray';
    if (score >= 50) return 'green';
    if (score >= 0) return 'blue';
    return 'red';
  }

  getScoreLabel(score: number | undefined): string {
    if (score === undefined || score === null) return 'N/A';
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 0) return 'Average';
    if (score >= -50) return 'Below Average';
    return 'Poor';
  }

  getAbilityName(key: keyof GameScore): string {
    const names: Record<keyof GameScore, string> = {
      mentalFortitudeComposure: 'Mental Fortitude & Composure',
      adaptabilityDecisionMaking: 'Adaptability & Decision Making',
      aimMechanicalSkill: 'Aim & Mechanical Skill',
      gameSenseAwareness: 'Game Sense & Awareness',
      teamworkCommunication: 'Teamwork & Communication',
      strategy: 'Strategy',
    };
    return names[key] || key;
  }

  getScorePercentage(score: number | undefined): number {
    if (score === undefined || score === null) return 0;
    // Convert from -100 to 100 range to 0-100 percentage
    return Math.max(0, Math.min(100, ((score + 100) / 2)));
  }

  getScoreForAbility(ability: keyof GameScore): number | undefined {
    return this.score()?.[ability];
  }

  getIconForAbility(ability: keyof GameScore): string {
    const icons: Record<keyof GameScore, string> = {
      mentalFortitudeComposure: 'psychology',
      adaptabilityDecisionMaking: 'lightbulb',
      aimMechanicalSkill: 'mouse',
      gameSenseAwareness: 'visibility',
      teamworkCommunication: 'group',
      strategy: 'military_tech',
    };
    return icons[ability] || 'help';
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar'],
    });
  }
}

