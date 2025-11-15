import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AbilityRadarChartComponent } from '../../../profile/components/ability-radar-chart/ability-radar-chart.component';

export interface FriendSpyCardDialogData {
  username: string;
  friendName: string;
}

@Component({
  selector: 'app-friend-spy-card-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    AbilityRadarChartComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>radar</mat-icon>
      {{ data.friendName }}'s Spy Card
    </h2>
    <mat-dialog-content class="friend-spy-card-dialog">
      <app-ability-radar-chart [username]="data.username"></app-ability-radar-chart>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">
        <mat-icon>close</mat-icon>
        Close
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .friend-spy-card-dialog {
        min-width: 600px;
        padding: 20px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
      }
    `,
  ],
})
export class FriendSpyCardDialogComponent {
  readonly data = inject<FriendSpyCardDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FriendSpyCardDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}

