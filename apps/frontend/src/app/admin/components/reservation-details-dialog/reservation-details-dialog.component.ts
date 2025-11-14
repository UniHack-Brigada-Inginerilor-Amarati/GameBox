import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from '../../services/admin.service';
import { Reservation } from '@gamebox/shared';
import { TIME_SLOTS } from '@gamebox/shared';

@Component({
  selector: 'app-reservation-details-dialog',
  templateUrl: './reservation-details-dialog.component.html',
  styleUrls: ['./reservation-details-dialog.component.scss'],
  standalone: false,
})
export class ReservationDetailsDialogComponent implements OnInit {
  reservation: Reservation;
  participants: any[] = [];
  loadingParticipants = false;
  editForm!: FormGroup;
  timeSlots = TIME_SLOTS;
  statuses = ['pending', 'confirmed', 'finished', 'cancelled', 'no-show'] as const;
  levels = ['beginner', 'intermediate', 'advanced'] as const;
  gameModes = ['5v5', '3v3', '1v1', 'Training'] as const;
  data = inject(MAT_DIALOG_DATA);

  private dialogRef = inject(MatDialogRef<ReservationDetailsDialogComponent>);
  private adminService = inject(AdminService);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  constructor() {
    this.reservation = this.data.reservation;
  }

  ngOnInit(): void {
    this.loadParticipants();
    this.initEditForm();
  }

  private initEditForm(): void {
    this.editForm = this.formBuilder.group({
      date: [this.reservation.date, Validators.required],
      slot_time: [this.reservation.slot_time, Validators.required],
      game_mode: [this.reservation.game_mode, Validators.required],
      level: [this.reservation.level, Validators.required],
      max_participants: [
        this.reservation.max_participants,
        [Validators.required, Validators.min(1), Validators.max(10)],
      ],
      is_public: [this.reservation.is_public],
    });

    setTimeout(() => {
      this.editForm.patchValue({
        slot_time: this.getCurrentTimeValue(),
      });
    }, 100);
  }

  private getCurrentTimeValue(): string {
    const currentTime = this.reservation.slot_time;
    if (this.timeSlots.includes(currentTime)) {
      return currentTime;
    }
    return this.timeSlots[0];
  }

  private loadParticipants(): void {
    this.loadingParticipants = true;
    this.adminService.getReservationParticipants(this.reservation.id).subscribe({
      next: (response) => {
        if (response.data) {
          this.participants = response.data;
        }
        this.loadingParticipants = false;
      },
      error: (error) => {
        console.error('Error loading participants:', error);
        this.loadingParticipants = false;
        this.snackBar.open('Error loading participants', 'Close', { duration: 3000 });
      },
    });
  }

  updateStatus(status: 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show'): void {
    this.adminService.updateReservationStatus(this.reservation.id, status).subscribe({
      next: () => {
        this.reservation.status = status;
        this.snackBar.open(`Status updated to ${status}`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Error updating status', 'Close', { duration: 3000 });
      },
    });
  }

  saveChanges(): void {
    if (this.editForm.valid) {
      const updates = this.editForm.value;
      this.adminService.updateReservation(this.reservation.id, updates).subscribe({
        next: () => {
          this.reservation = { ...this.reservation, ...updates };
          this.snackBar.open('Reservation updated successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error updating reservation:', error);
          this.snackBar.open('Error updating reservation', 'Close', { duration: 3000 });
        },
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
