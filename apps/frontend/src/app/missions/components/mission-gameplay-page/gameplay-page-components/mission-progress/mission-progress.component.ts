import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-mission-progress',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatIconModule],
  templateUrl: './mission-progress.component.html',
  styleUrls: ['./mission-progress.component.scss']
})
export class MissionProgressComponent {
  @Input({ required: true }) missionName!: string;
  @Input({ required: true }) currentGameIndex!: number;
  @Input({ required: true }) totalGames!: number;
  @Input({ required: true }) missionCompleted!: boolean;
  @Input({ required: true }) playersCount!: number;

  get progress(): number {
    return ((this.currentGameIndex + 1) / this.totalGames) * 100;
  }

  get gameStatus(): string {
    if (this.missionCompleted) return 'Mission Completed!';
    return `Game ${this.currentGameIndex + 1} of ${this.totalGames}`;
  }
}
