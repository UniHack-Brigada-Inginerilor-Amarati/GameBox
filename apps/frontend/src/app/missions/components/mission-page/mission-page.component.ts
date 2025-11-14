import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Mission, Game, RichTextUtils, RichTextDescription } from '@gamebox/shared';
import { MissionService } from '../../services/mission.service';
import { GameCardComponent } from '../../../games/components/game-card/game-card.component';


@Component({
  selector: 'app-mission-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, GameCardComponent],
  templateUrl: './mission-page.component.html',
  styleUrl: './mission-page.component.scss',
})
export class MissionPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private missionService = inject(MissionService);

  mission: Mission | null = null;
  isLoading = true;
  missionSlug: string | null = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.missionSlug = params['slug'];
      this.loadMission();
    });
  }

  loadMission(): void {
    if (!this.missionSlug) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.missionService.getMissionBySlug(this.missionSlug).subscribe({
      next: (mission: Mission) => {
        this.mission = mission;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading mission:', error);
        this.mission = null;
        this.isLoading = false;
      }
    });
  }

  getDescriptionText(description: string | RichTextDescription): string {
    return RichTextUtils.getDescriptionText(description);
  }

  getGameForCard(game: Game | null | undefined, category: string): Game | null {
    if (!game) {
      return null;
    }
    return {
      ...game,
      category: category
    } as Game & { category: string };
  }

  goBack(): void {
    this.router.navigate(['/missions']);
  }
}
