import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminReservationUI } from '../admin-reservations/admin-reservations.component';

export interface ReservationStatusDialogData {
  reservation: AdminReservationUI;
  action: 'finished' | 'no-show';
  title: string;
  message: string;
}

@Component({
  selector: 'app-reservation-status-dialog',
  templateUrl: './reservation-status-dialog.component.html',
  styleUrls: ['./reservation-status-dialog.component.scss'],
  standalone: false,
})
export class ReservationStatusDialogComponent {
  private dialogRef = inject(MatDialogRef<ReservationStatusDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getActionIcon(): string {
    return this.data.action === 'finished' ? 'check_circle' : 'cancel';
  }

  getActionColor(): string {
    return this.data.action === 'finished' ? 'primary' : 'warn';
  }

  getActionButtonText(): string {
    return this.data.action === 'finished' ? 'Mark as Finished' : 'Mark as No-Show';
  }
}
