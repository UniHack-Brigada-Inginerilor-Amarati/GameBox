import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Mission } from '@gamebox/shared';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../services/mission.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-mission-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './mission-card.component.html',
  styleUrls: ['./mission-card.component.scss'],
})
export class MissionCardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() mission!: Mission;
  @Input() showDescription = true;
  @Input() showGames = false;
  @Input() showPlayButton = false;
  @Output() playMission = new EventEmitter<Mission>();

  private missionService = inject(MissionService);
  hasJoined = false;
  isLoading = false;
  playerState: 'playing' | 'completed' = 'playing';

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

  ngOnInit(): void {
    this.updateMissionStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mission'] && !changes['mission'].firstChange) {
      this.updateMissionStatus();
    }
  }

  private updateMissionStatus(): void {
    // Check if user has joined this mission from the mission data
    if (this.mission) {
      this.hasJoined = (this.mission as any).hasJoined || false;
      this.playerState = (this.mission as any).playerState || 'playing';
    }
  }

  ngOnDestroy(): void {
    // No subscription to clean up
  }

  onPlayMission(event: Event): void {
    event.stopPropagation();
    
    if (this.hasJoined || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.missionService.playMission(this.mission.slug).subscribe({
      next: () => {
        this.hasJoined = true;
        this.isLoading = false;
        this.playMission.emit(this.mission);
      },
      error: (error) => {
        console.error('Error playing mission:', error);
        this.isLoading = false;
      },
    });
  }

  /**
   * Get array of games that exist in the mission
   * Returns games with their ability information
   */
  getExistingGames(): Array<{ game: any; abilityName: string; abilityIcon: string; abilityClass: string }> {
    const games: Array<{ game: any; abilityName: string; abilityIcon: string; abilityClass: string }> = [];

    if (this.mission.games.mentalFortitudeComposure) {
      games.push({
        game: this.mission.games.mentalFortitudeComposure,
        abilityName: 'Mental Fortitude & Composure',
        abilityIcon: '🧠',
        abilityClass: 'mental',
      });
    }

    if (this.mission.games.adaptabilityDecisionMaking) {
      games.push({
        game: this.mission.games.adaptabilityDecisionMaking,
        abilityName: 'Adaptability & Decision Making',
        abilityIcon: '🔄',
        abilityClass: 'adaptability',
      });
    }

    if (this.mission.games.aimMechanicalSkill) {
      games.push({
        game: this.mission.games.aimMechanicalSkill,
        abilityName: 'Aim & Mechanical Skill',
        abilityIcon: '🎯',
        abilityClass: 'aim',
      });
    }

    if (this.mission.games.gameSenseAwareness) {
      games.push({
        game: this.mission.games.gameSenseAwareness,
        abilityName: 'Game Sense & Awareness',
        abilityIcon: '👁️',
        abilityClass: 'awareness',
      });
    }

    if (this.mission.games.teamworkCommunication) {
      games.push({
        game: this.mission.games.teamworkCommunication,
        abilityName: 'Teamwork & Communication',
        abilityIcon: '💬',
        abilityClass: 'communication',
      });
    }

    if (this.mission.games.strategy) {
      games.push({
        game: this.mission.games.strategy,
        abilityName: 'Strategy',
        abilityIcon: '🧩',
        abilityClass: 'strategy',
      });
    }

    return games;
  }
}
