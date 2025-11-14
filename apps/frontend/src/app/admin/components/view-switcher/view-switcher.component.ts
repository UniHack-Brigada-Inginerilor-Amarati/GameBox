import { Component, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-switcher',
  templateUrl: './view-switcher.component.html',
  styleUrls: ['./view-switcher.component.scss'],
  standalone: false,
})
export class ViewSwitcherComponent {
  @Output() viewChanged = new EventEmitter<string>();

  currentView: 'calendar' | 'reservations' = 'calendar';

  private router = inject(Router);

  constructor() {
    const currentPath = this.router.url;
    if (currentPath.includes('/calendar')) {
      this.currentView = 'calendar';
    } else if (currentPath.includes('/reservations')) {
      this.currentView = 'reservations';
    }
  }

  switchToCalendar(): void {
    this.currentView = 'calendar';
    this.router.navigate(['/admin/calendar']);
    this.viewChanged.emit('calendar');
  }

  switchToReservations(): void {
    this.currentView = 'reservations';
    this.router.navigate(['/admin/reservations']);
    this.viewChanged.emit('reservations');
  }
}
