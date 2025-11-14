import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CounterService } from '../../services/counter.service';
import { Subscription } from 'rxjs';
import { Game, ScratchCard } from '@gamebox/shared';

const COUNTER_ANIMATION_DURATION = 2000;
const ANIMATION_DELAY = 100;

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './player-stats.component.html',
  styleUrls: ['./player-stats.component.scss'],
})
export class PlayerStatsComponent implements OnInit, OnDestroy {
  @Input() games: Game[] = [];
  @Input() scratchCard: ScratchCard | null = null;

  readonly animatedTotalGames = signal(0);
  readonly animatedCompletedGames = signal(0);
  readonly animatedCompletionRate = signal(0);

  private counterService: CounterService = inject(CounterService);
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    setTimeout(() => {
      this.startCounterAnimations();
    }, ANIMATION_DELAY);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private startCounterAnimations(): void {
    const totalGames = this.getTotalGamesCount();
    const completedGames = this.getPlayedGamesCount();
    const completionRate = this.getCompletionRate();

    const totalGamesSub = this.counterService
      .animateCounter(totalGames, COUNTER_ANIMATION_DURATION)
      .subscribe((value) => {
        this.animatedTotalGames.set(value);
      });

    const completedGamesSub = this.counterService
      .animateCounter(completedGames, COUNTER_ANIMATION_DURATION, 0)
      .subscribe((value) => {
        this.animatedCompletedGames.set(value);
      });

    const completionRateSub = this.counterService
      .animatePercentage(completionRate, COUNTER_ANIMATION_DURATION)
      .subscribe((value) => {
        this.animatedCompletionRate.set(value);
      });

    this.subscriptions.push(
      totalGamesSub,
      completedGamesSub,
      completionRateSub
    );
  }

  getTotalGamesCount(): number {
    return this.games.length;
  }

  getPlayedGamesCount(): number {
    if (!this.scratchCard) {
      return 0;
    }
    return this.scratchCard.completedGames || 0;
  }

  getCompletionRate(): number {
    const totalGames = this.getTotalGamesCount();
    const completedGames = this.getPlayedGamesCount();
    return totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;
  }

  isGamePlayed(game: Game): boolean {
    if (!this.scratchCard || !game.slug) {
      return false;
    }
    return this.scratchCard.gameStatus?.[game.slug]?.isPlayed === true;
  }
}
