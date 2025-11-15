import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Tournament } from '@gamebox/shared';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tournament-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './tournament-card.component.html',
  styleUrls: ['./tournament-card.component.scss'],
})
export class TournamentCardComponent {
  @Input() tournament!: Tournament;
  @Input() showDescription = true;
  @Input() showJoinButton = true;
  @Output() joinTournament = new EventEmitter<Tournament>();
  @Output() leaveTournament = new EventEmitter<Tournament>();

  get currentPlayers(): number {
    return this.tournament.currentPlayers || 0;
  }

  get availableSpots(): number {
    return Math.max(0, this.tournament.maxPlayers - this.currentPlayers);
  }

  get isFull(): boolean {
    return this.availableSpots === 0;
  }

  get canJoin(): boolean {
    return !this.isFull && !this.isRegistered && this.availableSpots > 0;
  }

  get isRegistered(): boolean {
    return this.tournament.isRegistered || false;
  }

  get showLeaveButton(): boolean {
    return this.isRegistered && !this.isFull;
  }

  get formattedDate(): string {
    if (!this.tournament.date) return '';
    const date = new Date(this.tournament.date);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get formattedTime(): string {
    return this.tournament.time || '';
  }

  get gameImageUrl(): string {
    if (this.tournament.game?.picture) {
      const picture = this.tournament.game.picture;
      if (typeof picture === 'string') {
        if (picture.startsWith('http')) {
          return picture;
        }
        return `${environment.backendUrl}${picture}`;
      }
    }
    return environment.missionFallbackImage || '';
  }

  onImageError(event: Event): void {
    const imageElement = event.target as HTMLImageElement;
    if (!imageElement) {
      return;
    }
    imageElement.src = environment.missionFallbackImage || '';
    imageElement.alt = 'Image not available';
  }

  onJoinTournament(event: Event): void {
    event.stopPropagation();
    if (this.canJoin) {
      this.joinTournament.emit(this.tournament);
    }
  }

  onLeaveTournament(event: Event): void {
    event.stopPropagation();
    if (this.isRegistered) {
      this.leaveTournament.emit(this.tournament);
    }
  }
}

