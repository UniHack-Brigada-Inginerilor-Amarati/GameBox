import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-complete-mission-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Complete Mission</h2>
    <mat-dialog-content>
      <p>Are you sure you want to complete <strong>{{ data.missionName }}</strong>?</p>
      <p>This will save all scores for {{ data.playerCount }} player(s) and mark the mission as completed.</p>
      <p class="warning">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onConfirm()">Complete Mission</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        padding: 20px 24px;
      }
      .warning {
        color: #f44336;
        font-weight: 500;
        margin-top: 10px;
      }
      mat-dialog-actions {
        padding: 8px 24px 16px;
      }
    `,
  ],
})
export class ConfirmCompleteMissionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmCompleteMissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { missionName: string; playerCount: number },
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

