import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AdminReservation } from '@gamebox/shared';

export interface ReservationDeleteDialogData {
  reservation: AdminReservation;
}

@Component({
  selector: 'app-reservation-delete-dialog',
  standalone: false,
  templateUrl: './reservation-delete-dialog.component.html',
  styleUrls: ['./reservation-delete-dialog.component.scss'],
})
export class ReservationDeleteDialogComponent {
  private dialogRef = inject(MatDialogRef<ReservationDeleteDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
