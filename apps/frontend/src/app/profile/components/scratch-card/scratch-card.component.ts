import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Game, ScratchCard } from '@gamebox/shared';
import { ScratchCardService } from '../../services/scratch-card.service';
import { PlayerStatsComponent } from '../player-stats/player-stats.component';
import { MiniScratchCard } from '../mini-scratch-card/mini-scratch-card';

@Component({
  selector: 'app-scratch-card',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    PlayerStatsComponent,
    MiniScratchCard,
  ],
  templateUrl: './scratch-card.component.html',
  styleUrls: ['./scratch-card.component.scss'],
})
export class ScratchCardComponent implements OnInit {
  scratchCard: ScratchCard | null = null;
  loading = true;
  error: string | null = null;
  flipStates: { [key: string]: string } = {};

  private scratchCardService: ScratchCardService = inject(ScratchCardService);

  ngOnInit() {
    this.loadScratchCard();
  }

  async loadScratchCard() {
    this.loading = true;
    this.error = null;

    this.scratchCardService.getScratchCard().subscribe({
      next: (scratchCard) => {
        this.scratchCard = scratchCard;

        scratchCard.games.forEach((game) => {
          if (game.slug) {
            this.flipStates[game.slug] = 'inactive';
          }
        });

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading scratch card:', error);
        this.error = 'Failed to load games. Please try again.';
        this.loading = false;
      },
    });
  }

  get games(): Game[] {
    return this.scratchCard?.games || [];
  }

  getFlipState(game: Game): string {
    return game.slug ? this.flipStates[game.slug] || 'inactive' : 'inactive';
  }

  onCardFlip(game: Game): void {
    if (game.slug) {
      this.flipStates[game.slug] =
        this.flipStates[game.slug] === 'active' ? 'inactive' : 'active';
    }
  }
}
