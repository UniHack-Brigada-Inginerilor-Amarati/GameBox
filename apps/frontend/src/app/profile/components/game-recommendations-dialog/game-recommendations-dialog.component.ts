import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Game } from '@gamebox/shared';
import { GameService } from '../../../games/services/game.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-game-recommendations-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>auto_awesome</mat-icon>
      AI Game Recommendations
    </h2>
    <mat-dialog-content class="recommendations-content">
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Analyzing your spy card and generating recommendations...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-button color="primary" (click)="loadRecommendations()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>
      } @else if (recommendedGames().length > 0) {
        <div class="recommendations-intro">
          <p>Based on your ability scores, here are 3 games we recommend for you:</p>
        </div>
        <div class="games-grid">
          @for (game of recommendedGames(); track game.slug; let i = $index) {
            <mat-card class="game-card">
              <div class="recommendation-badge">
                <span class="badge-number">{{ i + 1 }}</span>
                <span class="badge-label">Recommended</span>
              </div>
              <div class="game-image-container">
                @if (getGameImageUrl(game)) {
                  <img [src]="getGameImageUrl(game)" [alt]="game.name" class="game-image" />
                } @else {
                  <div class="game-image-placeholder">
                    <mat-icon>sports_esports</mat-icon>
                  </div>
                }
              </div>
              <mat-card-content>
                <h3 class="game-name">{{ game.name }}</h3>
                @if (game.recommendationReason) {
                  <p class="game-recommendation-reason">{{ game.recommendationReason }}</p>
                } @else {
                  <p class="game-description">{{ game.description }}</p>
                }
                @if (game.abilities && game.abilities.length > 0) {
                  <div class="game-abilities">
                    <span class="abilities-label">Tests:</span>
                    <div class="abilities-tags">
                      @for (ability of game.abilities; track ability.slug) {
                        <span class="ability-tag">{{ ability.name }}</span>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      } @else {
        <div class="no-recommendations">
          <mat-icon>info_outline</mat-icon>
          <p>No recommendations available at this time.</p>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">
        <mat-icon>close</mat-icon>
        Close
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .recommendations-content {
        min-width: 800px;
        max-width: 1000px;
        padding: 20px;
      }

      .loading-container,
      .error-container,
      .no-recommendations {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 16px;
        text-align: center;
      }

      .error-container mat-icon,
      .no-recommendations mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #f44336;
      }

      .no-recommendations mat-icon {
        color: #999;
      }

      .recommendations-intro {
        margin-bottom: 24px;
        text-align: center;
        color: #666;
      }

      .games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .game-card {
        position: relative;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .game-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }

      .recommendation-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .badge-number {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .game-image-container {
        width: 100%;
        height: 200px;
        overflow: hidden;
        background: #f5f5f5;
      }

      .game-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .game-image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e0e0e0;
        color: #999;
      }

      .game-image-placeholder mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      .game-name {
        margin: 16px 0 8px 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #333;
      }

      .game-description,
      .game-recommendation-reason {
        color: #666;
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .game-recommendation-reason {
        font-style: italic;
        color: #556;
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        border-left: 3px solid #667eea;
      }

      .game-abilities {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e0e0e0;
      }

      .abilities-label {
        font-size: 0.85rem;
        color: #999;
        margin-bottom: 8px;
        display: block;
      }

      .abilities-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .ability-tag {
        background: #e3f2fd;
        color: #1976d2;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      mat-dialog-actions {
        padding: 16px 24px;
      }

      @media (max-width: 900px) {
        .recommendations-content {
          min-width: auto;
          max-width: 100%;
        }

        .games-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class GameRecommendationsDialogComponent implements OnInit {
  readonly recommendedGames = signal<Array<Game & { recommendationReason?: string }>>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  private profileService = inject(ProfileService);
  private dialogRef = inject(MatDialogRef<GameRecommendationsDialogComponent>);
  private gameService = inject(GameService);

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.profileService.getGameRecommendations().subscribe({
      next: (games) => {
        this.recommendedGames.set(games);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set('Failed to load game recommendations. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading game recommendations:', err);
      },
    });
  }

  getGameImageUrl(game: Game): string {
    if (game.media && game.media.length > 0) {
      const mediaUrl = game.media[0].mediaField?.url || game.media[0].url;
      if (mediaUrl) return mediaUrl;
    }

    if (game.thumbnail) return game.thumbnail;
    if (game.picture) return game.picture;

    return '';
  }

  close(): void {
    this.dialogRef.close();
  }
}

