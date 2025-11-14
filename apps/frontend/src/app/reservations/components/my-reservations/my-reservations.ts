import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Reservation, GAME_MODES } from '@gamebox/shared';
import { AuthService } from '../../../auth';
import { ReservationService } from '../../services/reservation.service';

@Component({
  selector: 'app-my-reservations',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.css',
})
export class MyReservations implements OnInit {
  private reservationService = inject(ReservationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  public authService = inject(AuthService);

  reservations: Reservation[] = [];
  isLoading = false;
  gameModes = GAME_MODES;
  currentUserEmail: string | null = null;

  ngOnInit(): void {
    this.loadCurrentUserEmail();
    this.loadReservations();
  }

  private loadCurrentUserEmail(): void {
    this.authService.getCurrentUser().subscribe({
      next: (userData) => {
        if (userData.user?.email) {
          this.currentUserEmail = userData.user.email;
        }
      },
      error: (error) => {
        console.error('Error loading current user email:', error);
      },
    });
  }

  loadReservations(): void {
    this.isLoading = true;
    this.reservationService.getReservations().subscribe({
      next: (reservations) => {
        this.reservations = reservations;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading reservations:', error);
        this.snackBar.open('Error loading reservations', 'Close', { duration: 3000 });
        this.isLoading = false;
      },
    });
  }

  refreshReservationStatuses(): void {
    this.isLoading = true;
    this.snackBar.open('Refreshing reservation statuses...', 'Close', { duration: 2000 });

    this.reservationService.getReservations().subscribe({
      next: (reservations) => {
        this.reservations = reservations;
        this.isLoading = false;
        this.snackBar.open('Reservation statuses refreshed!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error refreshing reservations:', error);
        this.snackBar.open('Error refreshing reservations', 'Close', { duration: 3000 });
        this.isLoading = false;
      },
    });
  }

  getGameModeName(gameModeId: string): string {
    return this.gameModes.find((gm) => gm.id === gameModeId)?.name || gameModeId;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'cancelled':
        return 'warn';
      default:
        return 'basic';
    }
  }

  isUpcoming(reservation: Reservation): boolean {
    const reservationDate = new Date(reservation.date + 'T' + reservation.slot_time);
    return reservationDate > new Date() && reservation.status !== 'cancelled';
  }

  isPast(reservation: Reservation): boolean {
    const reservationDate = new Date(reservation.date + 'T' + reservation.slot_time);
    return reservationDate < new Date();
  }

  getUpcomingReservations(): Reservation[] {
    return this.reservations.filter((r) => this.isUpcoming(r));
  }

  getPastReservations(): Reservation[] {
    return this.reservations.filter((r) => this.isPast(r));
  }

  getMaxParticipantsForGame(gameMode: string): number {
    const gameLimits: { [key: string]: number } = {
      battleship: 4,
      paintball: 10,
      'laser-tag': 8,
      'escape-room': 6,
      archery: 4,
      climbing: 6,
    };

    return gameLimits[gameMode] || 4;
  }

  hasReachedMaxParticipants(reservation: Reservation): boolean {
    const currentParticipants = reservation.participants?.length || 0;
    const maxParticipants =
      reservation.max_participants || this.getMaxParticipantsForGame(reservation.game_mode);

    return currentParticipants >= maxParticipants;
  }

  getParticipantCountDisplay(reservation: Reservation): string {
    const currentParticipants = reservation.participants?.length || 0;
    const maxParticipants =
      reservation.max_participants || this.getMaxParticipantsForGame(reservation.game_mode);

    if (this.hasReachedMaxParticipants(reservation)) {
      return `${currentParticipants} players (MAX)`;
    } else {
      return `${currentParticipants} players`;
    }
  }

  cancelReservation(reservation: Reservation): void {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      this.reservationService.cancelReservation(reservation.id).subscribe({
        next: () => {
          this.snackBar.open('Reservation cancelled successfully', 'Close', { duration: 3000 });
          this.loadReservations();
        },
        error: (error) => {
          console.error('Error cancelling reservation:', error);
          this.snackBar.open('Error cancelling reservation', 'Close', { duration: 3000 });
        },
      });
    }
  }

  updateParticipantConfirmation(reservation: Reservation, email: string, confirmed: boolean): void {
    this.reservationService
      .updateParticipantConfirmation(reservation.id, email, confirmed)
      .subscribe({
        next: () => {
          const action = confirmed ? 'confirmed' : 'declined';
          this.snackBar.open(`Successfully ${action} attendance`, 'Close', { duration: 3000 });
          this.loadReservations();
        },
        error: (error) => {
          console.error('Error updating participant confirmation:', error);
          this.snackBar.open('Error updating confirmation status', 'Close', { duration: 3000 });
        },
      });
  }

  shareReservation(reservation: Reservation): void {
    // Use reservation ID directly for share link
    const shareUrl = `${window.location.origin}/r/${reservation.id}`;

    if (navigator.share) {
      navigator.share({
        title: `Join my ${this.getGameModeName(reservation.game_mode)} game session!`,
        text: `I've reserved a game session on ${reservation.date} at ${reservation.slot_time}. Join me!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          this.snackBar.open('Share link copied to clipboard!', 'Close', { duration: 3000 });
        })
        .catch(() => {
          this.snackBar.open('Share link: ' + shareUrl, 'Close', { duration: 5000 });
        });
    }
  }

  copyShareLink(reservationId: string): void {
    const shareUrl = `${window.location.origin}/r/${reservationId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          this.snackBar.open('Share link copied to clipboard!', 'Close', { duration: 3000 });
        })
        .catch((error) => {
          console.error('Clipboard API failed:', error);
          this.fallbackCopyToClipboard(shareUrl);
        });
    } else {
      this.fallbackCopyToClipboard(shareUrl);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');

      document.body.removeChild(textArea);

      if (successful) {
        this.snackBar.open('Share link copied to clipboard!', 'Close', { duration: 3000 });
      } else {
        this.snackBar.open('Failed to copy link. Please copy manually: ' + text, 'Close', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.snackBar.open('Failed to copy link. Please copy manually: ' + text, 'Close', {
        duration: 5000,
      });
    }
  }

  viewReservationDetails(reservation: Reservation): void {
    this.router.navigate(['/r', reservation.id]);
  }

  rebookReservation(reservation: Reservation): void {
    this.router.navigate(['/reservation/new'], {
      queryParams: {
        game_mode: reservation.game_mode,
        level: reservation.level,
        participants: reservation.participants.length,
      },
    });
  }

  formatDateTime(reservation: Reservation): string {
    return `${reservation.date} at ${reservation.slot_time}`;
  }

  getConfirmedParticipantsCount(reservation: Reservation): number {
    return reservation.participants.filter((p) => p.confirmed).length;
  }

  getTotalParticipantsCount(reservation: Reservation): number {
    return reservation.participants.length;
  }

  isOwner(participant: any, reservation: Reservation): boolean {
    return reservation.participants.indexOf(participant) === 0;
  }

  viewReservation(reservation: Reservation): void {
    this.viewReservationDetails(reservation);
  }

  editReservation(reservation: Reservation): void {
    this.router.navigate(['/reservation/edit', reservation.id]);
  }

  getCurrentUserParticipant(reservation: Reservation): any {
    if (!this.currentUserEmail) {
      console.warn('Current user email not loaded yet');
      return null;
    }

    return reservation.participants.find((p) => p.email === this.currentUserEmail);
  }

  isCurrentUserConfirmed(reservation: Reservation): boolean {
    const participant = this.getCurrentUserParticipant(reservation);
    return participant?.confirmed || false;
  }

  isOwnerOfReservation(reservation: Reservation): boolean {
    return (reservation as any).is_owner === true;
  }
}
