import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UserProfile, PlayerGameResult } from '@gamebox/shared';

@Component({
  selector: 'app-players-progress',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './players-progress.component.html',
  styleUrls: ['./players-progress.component.scss'],
})
export class PlayersProgressComponent {
  @Input({ required: true }) players!: UserProfile[];
  @Input({ required: true }) gameResults!: PlayerGameResult[];
  @Input({ required: true }) currentGameIndex!: number;
  @Input({ required: true }) missionCompleted!: boolean;

  getPlayerTotalScore(playerName: string): number {
    return this.gameResults
      .filter((result) => result.player_name === playerName)
      .reduce((total, result) => total + (result.total_score || 0), 0);
  }

  isPlayerCompleted(playerName: string): boolean {
    const playerResults = this.gameResults.filter((result) => result.player_name === playerName);
    return playerResults.length >= this.currentGameIndex + 1;
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }
}
