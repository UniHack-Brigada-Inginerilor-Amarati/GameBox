import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminCalendarComponent } from './components/admin-calendar/admin-calendar.component';
import { AdminReservationsComponent } from './components/admin-reservations/admin-reservations.component';
import { ViewSwitcherComponent } from './components/view-switcher/view-switcher.component';
import { ReservationStatusDialogComponent } from './components/reservation-status-dialog/reservation-status-dialog.component';
import { ReservationDeleteDialogComponent } from './components/reservation-delete-dialog/reservation-delete-dialog.component';
import { ReservationDetailsDialogComponent } from './components/reservation-details-dialog/reservation-details-dialog.component';

import { adminRoutes } from './admin.routes';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminCalendarComponent,
    AdminReservationsComponent,
    ViewSwitcherComponent,
    ReservationStatusDialogComponent,
    ReservationDeleteDialogComponent,
    ReservationDetailsDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(adminRoutes),
    ReactiveFormsModule,
    FormsModule,

    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatListModule,
    MatExpansionModule,
    MatDividerModule,
    MatStepperModule,
  ],
})
export class AdminModule {}
