import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Mission } from '@gamebox/shared';
import { MissionService } from '../../services/mission.service';
import { MissionCardComponent } from '../mission-card/mission-card.component';

@Component({
  selector: 'app-mission-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule,
    MissionCardComponent,
  ],
  templateUrl: './mission-dashboard.component.html',
  styleUrl: './mission-dashboard.component.scss',
})
export class MissionDashboardComponent implements OnInit {
  missions: Mission[] = [];
  loading = false;
  error: string | null = null;

  private missionService: MissionService = inject(MissionService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private router: Router = inject(Router);

  ngOnInit(): void {
    this.loadMissions();
  }

  loadMissions(): void {
    this.loading = true;
    this.error = null;

    this.missionService.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load missions. Please try again later.';
        this.loading = false;
        this.snackBar.open(this.error, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
  }

  trackByMissionSlug(index: number, mission: Mission): string {
    return mission.slug;
  }

  onPlayMission(mission: Mission): void {
    this.router.navigate(['/missions', mission.slug, 'play']);
  }
}
