import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminCalendarComponent } from './components/admin-calendar/admin-calendar.component';
import { AdminReservationsComponent } from './components/admin-reservations/admin-reservations.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
  },
  {
    path: 'calendar',
    component: AdminCalendarComponent,
  },
  {
    path: 'reservations',
    component: AdminReservationsComponent,
  },
];
