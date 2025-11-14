import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Game } from '@gamebox/shared';
import { GameService } from '../../services/game.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.scss'],
})
export class GameCardComponent implements OnInit {
  @Input() game: (Game & { category?: string }) | null = null;

  isExpanded = false;
  private gameService = inject(GameService);
  gameData: Game | null = null;
  environment = environment;

  ngOnInit(): void {
    if (this.game) {
      this.loadGameData();
    }
  }

  private loadGameData(): void {
    if (this.game?.slug) {
      this.gameService.getGameBySlug(this.game.slug).subscribe({
        next: (game) => {
          this.gameData = game;
        },
        error: (error) => {
          console.error('Error loading game data:', error);
          this.gameData = this.game;
        },
      });
    } else {
      this.gameData = this.game;
    }
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
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
}
