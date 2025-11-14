import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Mission } from '@gamebox/shared';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mission-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './mission-card.component.html',
  styleUrls: ['./mission-card.component.scss'],
})
export class MissionCardComponent {
  @Input() mission!: Mission;
  @Input() showDescription = true;
  @Input() showGames = false;
  @Input() showPlayButton = false;
  @Output() playMission = new EventEmitter<Mission>();

  getMediaUrl(media: { url: string; alt?: string } | undefined): string {
    return media?.url || '';
  }

  onImageError(event: Event): void {
    const imageElement = event.target as HTMLImageElement;
    if (!imageElement) {
      return;
    }
    imageElement.src = environment.missionFallbackImage;
    imageElement.alt = 'Image not available';
  }

  onPlayMission(event: Event): void {
    event.stopPropagation();
    this.playMission.emit(this.mission);
  }
}
