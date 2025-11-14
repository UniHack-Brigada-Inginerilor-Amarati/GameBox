import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Game, ScratchCard } from '@gamebox/shared';
import { environment } from '../../../../environments/environment';

const ANIMATION_DURATION = 500;

@Component({
  selector: 'app-mini-scratch-card',
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule, MatTooltipModule],
  templateUrl: './mini-scratch-card.html',
  styleUrls: ['./mini-scratch-card.scss'],
  animations: [
    trigger('flipState', [
      state(
        'active',
        style({
          transform: 'rotateY(179deg)',
        }),
      ),
      state(
        'inactive',
        style({
          transform: 'rotateY(0)',
        }),
      ),
      transition('active => inactive', animate(`${ANIMATION_DURATION}ms ease-out`)),
      transition('inactive => active', animate(`${ANIMATION_DURATION}ms ease-in`)),
    ]),
  ],
})
export class MiniScratchCard {
  @Input() game!: Game;
  @Input() scratchCard: ScratchCard | null = null;
  @Input() flipState = 'inactive';
  @Output() cardClick = new EventEmitter<Game>();
  @Output() cardKeyup = new EventEmitter<{
    event: KeyboardEvent;
    game: Game;
  }>();

  onCardClick() {
    this.cardClick.emit(this.game);
  }

  onCardKeyup(event: Event) {
    if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
      event.preventDefault();
      this.cardKeyup.emit({ event: event as KeyboardEvent, game: this.game });
    }
  }

  isGamePlayed(game: Game): boolean {
    if (!this.scratchCard || !game.slug) {
      return false;
    }

    return this.scratchCard.gameStatus?.[game.slug]?.isPlayed === true;
  }

  getGameImageUrl(game: Game): string {
    if (game.media && game.media.length > 0) {
      const mediaUrl = game.media[0].mediaField?.url || game.media[0].url;
      if (mediaUrl) return mediaUrl;
    }

    if (game.thumbnail) return game.thumbnail;
    if (game.picture) return game.picture;

    return environment.gameFallbackImage;
  }

  getAbilityIconUrl(ability: { icon?: { url?: string } }): string {
    return ability?.icon?.url || environment.gameFallbackImage;
  }

  onImageError(event: Event): void {
    const imageElement = event.target as HTMLImageElement;
    if (imageElement) {
      imageElement.src = environment.gameFallbackImage;
      imageElement.alt = 'Image not available';
    }
  }

  onAbilityIconError(event: Event): void {
    const imageElement = event.target as HTMLImageElement;
    if (imageElement) {
      imageElement.src = environment.gameFallbackImage;
      imageElement.alt = 'Icon not available';
    }
  }
}
