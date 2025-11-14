import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Reservation, GAME_MODES } from '@gamebox/shared';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-reservation-share',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatSnackBarModule,
  ],
  templateUrl: './reservation-share.html',
  styleUrl: './reservation-share.css',
})
export class ReservationShare implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reservationService = inject(ReservationService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  reservation?: Reservation;
  isLoading = false;
  error = '';
  gameModes = GAME_MODES;
  confirmForm: FormGroup;
  showConfirmForm = false;
  isAuthenticated = false;
  currentUser: any = null;
  isOwner = false;
  isParticipant = false;
  canAutoConfirm = false;

  constructor() {
    this.confirmForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async ngOnInit(): Promise<void> {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (reservationId) {
      this.loadReservation(reservationId);
      await this.checkAuthentication();
    } else {
      this.error = 'Invalid reservation link';
    }
  }

  private async checkAuthentication(): Promise<void> {
    try {
      this.isAuthenticated = await this.authService.isAuthenticated();
      if (this.isAuthenticated) {
        try {
          const session = await this.authService.getSession();
          if (session.data.session?.user) {
            this.currentUser = session.data.session.user;
            if (this.reservation) {
              this.checkUserRole();
            }
          }
        } catch (error) {
          console.error('Error getting current user:', error);
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  }

  public getUserEmail(): string | undefined {
    if (this.currentUser && this.currentUser.email) {
      return this.currentUser.email;
    }
    return undefined;
  }

  public getUserId(): string | undefined {
    if (this.currentUser && this.currentUser.id) {
      return this.currentUser.id;
    }
    return undefined;
  }

  public isParticipantConfirmedSafe(email: string | undefined): boolean {
    if (!email) return false;
    return this.isParticipantConfirmed(email);
  }

  private checkUserRole(): void {
    if (!this.reservation) return;

    const userId = this.getUserId();
    const userEmail = this.getUserEmail();

    this.isOwner = this.reservation.owner_id === userId;

    if (this.reservation.participants && Array.isArray(this.reservation.participants)) {
      this.isParticipant = this.reservation.participants.some((p) => p.email === userEmail);

      if (this.isParticipant && userEmail && !this.isParticipantConfirmedSafe(userEmail)) {
        this.canAutoConfirm = true;

        this.autoConfirmParticipation();
      }
    } else {
      this.isParticipant = false;
      this.canAutoConfirm = false;
    }
  }

  loadReservation(reservationId: string): void {
    this.isLoading = true;
    this.error = '';

    this.reservationService.getReservationByToken(reservationId).subscribe({
      next: (reservation) => {
        this.reservation = reservation;
        this.isLoading = false;

        if (this.isAuthenticated && this.currentUser) {
          this.checkUserRole();
        }
      },
      error: (error) => {
        console.error('Error loading reservation:', error);
        this.error = 'Reservation not found or link has expired';
        this.isLoading = false;
      },
    });
  }

  private autoConfirmParticipation(): void {
    if (!this.reservation || !this.currentUser) return;

    const reservationId = this.route.snapshot.paramMap.get('id');
    const userEmail = this.getUserEmail();
    if (reservationId && userEmail) {
      this.reservationService.confirmParticipation(reservationId, userEmail).subscribe({
        next: (updatedReservation) => {
          this.reservation = updatedReservation;
          this.canAutoConfirm = false;
          this.isParticipant = true;
          this.checkUserRole();
          this.snackBar.open('Participation automatically confirmed!', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error auto-confirming participation:', error);
          this.snackBar.open(
            'Could not auto-confirm participation. Please confirm manually.',
            'Close',
            { duration: 3000 },
          );
        },
      });
    }
  }

  getGameModeName(gameModeId: string): string {
    return this.gameModes.find((gm) => gm.id === gameModeId)?.name || gameModeId;
  }

  formatDateTime(reservation: Reservation): string {
    const date = new Date(reservation.date + 'T' + reservation.slot_time);
    return (
      date.toLocaleDateString() +
      ' at ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }

  getConfirmedParticipantsCount(): number {
    if (
      !this.reservation ||
      !this.reservation.participants ||
      !Array.isArray(this.reservation.participants)
    )
      return 0;
    return this.reservation.participants.filter((p) => p.confirmed).length;
  }

  getTotalParticipantsCount(): number {
    if (
      !this.reservation ||
      !this.reservation.participants ||
      !Array.isArray(this.reservation.participants)
    )
      return 0;
    return this.reservation.participants.length;
  }

  areAllParticipantsConfirmed(): boolean {
    if (
      !this.reservation ||
      !this.reservation.participants ||
      !Array.isArray(this.reservation.participants)
    ) {
      return false;
    }

    const allConfirmed = this.reservation.participants.every((p) => p.confirmed);

    return allConfirmed;
  }

  shouldShowConfirmButton(): boolean {
    if (!this.reservation) {
      return false;
    }

    if (this.areAllParticipantsConfirmed()) {
      return false;
    }

    const userEmail = this.getUserEmail();
    if (this.isParticipantConfirmedSafe(userEmail)) {
      return false;
    }

    if (this.isOwner) {
      return false;
    }

    if (!this.canUserJoin()) {
      return false;
    }

    const isUpcoming = this.isUpcoming();

    return isUpcoming;
  }

  refreshUserRole(): void {
    if (this.reservation && this.currentUser) {
      this.checkUserRole();
    }
  }

  refreshReservationData(): void {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (reservationId) {
      this.reservationService.getReservationByToken(reservationId).subscribe({
        next: (refreshedReservation) => {
          this.reservation = refreshedReservation;
          this.checkUserRole();
        },
        error: (error) => {
          console.error('Error refreshing reservation data:', error);
        },
      });
    }
  }

  isParticipantConfirmed(email: string): boolean {
    if (!this.reservation) return false;
    const participant = this.reservation.participants.find((p) => p.email === email);
    return participant?.confirmed || false;
  }

  showConfirmParticipation(): void {
    if (this.isAuthenticated) {
      this.refreshUserRole();
    }

    this.showConfirmForm = true;
  }

  handleJoinReservation(): void {
    const userEmail = this.getUserEmail();
    if (this.isAuthenticated && userEmail) {
      this.confirmParticipation();
    } else {
      this.showConfirmParticipation();
    }
  }

  confirmParticipation(): void {
    if (this.reservation) {
      let email: string;

      const userEmail = this.getUserEmail();
      if (this.isAuthenticated && userEmail) {
        email = userEmail;
      } else if (this.confirmForm.valid) {
        email = this.confirmForm.get('email')?.value;
      } else {
        return;
      }

      if (this.hasReachedMaxParticipants()) {
        this.snackBar.open(
          'Sorry, this reservation is full. Maximum participants reached.',
          'Close',
          { duration: 5000 },
        );
        return;
      }

      const reservationId = this.route.snapshot.paramMap.get('id');

      if (reservationId && email) {
        this.reservationService.confirmParticipation(reservationId, email).subscribe({
          next: (updatedReservation) => {
            this.reservation = updatedReservation;

            this.checkUserRole();

            this.showConfirmForm = false;
            this.confirmForm.reset();

            this.snackBar.open('Participation confirmed successfully!', 'Close', {
              duration: 3000,
            });
          },
          error: (error) => {
            console.error('Error confirming participation:', error);
            this.snackBar.open('Error confirming participation. Please try again.', 'Close', {
              duration: 3000,
            });
          },
        });
      } else {
        this.snackBar.open('Missing information. Please try again.', 'Close', { duration: 3000 });
      }
    }
  }

  cancelConfirm(): void {
    this.showConfirmForm = false;
    this.confirmForm.reset();
  }

  copyShareLink(): void {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (reservationId) {
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
    } else {
      this.snackBar.open('Unable to generate share link', 'Close', { duration: 3000 });
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

  isUpcoming(): boolean {
    if (!this.reservation) return false;
    const reservationDate = new Date(this.reservation.date + 'T' + this.reservation.slot_time);
    return reservationDate > new Date() && this.reservation.status !== 'cancelled';
  }

  isPast(): boolean {
    if (!this.reservation) return false;
    const reservationDate = new Date(this.reservation.date + 'T' + this.reservation.slot_time);
    return reservationDate < new Date();
  }

  getStatusColor(): string {
    if (!this.reservation) return 'basic';
    switch (this.reservation.status) {
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

  public canUserJoin(): boolean {
    if (!this.reservation) return false;

    if (this.hasReachedMaxParticipants()) {
      return false;
    }

    if (this.currentUser) {
      const userEmail = this.getUserEmail();
      if (userEmail && this.isParticipantConfirmed(userEmail)) {
        return false;
      }
    }

    if (this.isOwner) {
      return false;
    }

    if (!this.isUpcoming()) {
      return false;
    }

    if (!this.reservation.is_public) {
      return false;
    }

    return true;
  }

  public hasReachedMaxParticipants(): boolean {
    if (!this.reservation) return false;

    const currentParticipants = this.getTotalParticipantsCount();
    const maxParticipants = this.reservation.max_participants || this.getMaxParticipantsForGame();

    return currentParticipants >= maxParticipants;
  }

  public getMaxParticipantsForGame(): number {
    if (!this.reservation) return 0;

    const gameLimits: { [key: string]: number } = {
      battleship: 4,
      paintball: 10,
      'laser-tag': 8,
      'escape-room': 6,
      archery: 4,
      climbing: 6,
    };

    return gameLimits[this.reservation.game_mode] || 4;
  }

  public canUserAccess(): boolean {
    if (!this.reservation) return false;

    if (this.reservation.is_public) {
      return true;
    }

    if (this.isOwner) {
      return true;
    }

    if (this.currentUser) {
      const userEmail = this.getUserEmail();
      if (userEmail && this.isParticipantConfirmed(userEmail)) {
        return true;
      }
    }

    return false;
  }

  public getAccessMessage(): string {
    if (!this.reservation) return '';

    if (this.reservation.is_public) {
      return 'This is a public reservation. Anyone with the link can join.';
    } else {
      return 'This is a private reservation. Only invited participants can join.';
    }
  }
}
