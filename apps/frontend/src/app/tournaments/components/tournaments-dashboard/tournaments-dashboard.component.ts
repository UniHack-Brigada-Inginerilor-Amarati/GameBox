import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Tournament } from '@gamebox/shared';
import { TournamentService } from '../../services/tournament.service';
import { TournamentCardComponent } from '../tournament-card/tournament-card.component';

@Component({
  selector: 'app-tournaments-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    TournamentCardComponent,
  ],
  templateUrl: './tournaments-dashboard.component.html',
  styleUrl: './tournaments-dashboard.component.scss',
})
export class TournamentsDashboardComponent implements OnInit {
  tournaments: Tournament[] = [];
  loading = false;
  error: string | null = null;

  private tournamentService: TournamentService = inject(TournamentService);
  private snackBar: MatSnackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loading = true;
    this.error = null;

    this.tournamentService.getTournaments().subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load tournaments. Please try again later.';
        this.loading = false;
        console.error('Error loading tournaments:', error);
        this.snackBar.open(this.error, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      },
    });
  }

  trackByTournamentSlug(index: number, tournament: Tournament): string {
    return tournament.slug || tournament.id.toString();
  }

  onJoinTournament(tournament: Tournament): void {
    this.tournamentService.joinTournament(tournament.id).subscribe({
      next: () => {
        this.snackBar.open(
          `Successfully joined tournament "${tournament.name}"!`,
          'Close',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          }
        );
        // Reload tournaments to update player counts and registration status
        this.loadTournaments();
      },
      error: (error) => {
        const errorMessage =
          error.error?.message ||
          error.message ||
          'Failed to join tournament. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        console.error('Error joining tournament:', error);
      },
    });
  }

  onLeaveTournament(tournament: Tournament): void {
    this.tournamentService.leaveTournament(tournament.id).subscribe({
      next: () => {
        this.snackBar.open(
          `Successfully left tournament "${tournament.name}"`,
          'Close',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          }
        );
        // Reload tournaments to update player counts and registration status
        this.loadTournaments();
      },
      error: (error) => {
        const errorMessage =
          error.error?.message ||
          error.message ||
          'Failed to leave tournament. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
        console.error('Error leaving tournament:', error);
      },
    });
  }
}

