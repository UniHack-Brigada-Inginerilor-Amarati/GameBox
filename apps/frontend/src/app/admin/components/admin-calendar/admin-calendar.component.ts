import { Component, inject, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../services/admin.service';
import { AdminReservation } from '@gamebox/shared';
import { GAME_MODES } from '@gamebox/shared';
import { ReservationDetailsDialogComponent } from '../reservation-details-dialog/reservation-details-dialog.component';

@Component({
  selector: 'app-admin-calendar',
  templateUrl: './admin-calendar.component.html',
  styleUrls: ['./admin-calendar.component.scss'],
  standalone: false,
})
export class AdminCalendarComponent implements OnInit {
  currentDate = new Date();
  selectedDate = new Date();
  reservations: AdminReservation[] = [];
  loading = false;
  error: any = null;
  gameModes = GAME_MODES;

  viewMode: 'day' | 'week' | 'month' = 'week';
  timeSlots = this.generateTimeSlots();
  calendarDays: Array<{ date: Date; dayNumber: number }> = [];

  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.selectedDate = new Date(); // Use current date instead of hardcoded August date
    this.generateCalendarDays();
    this.loadReservations();
  }

  generateTimeSlots(): string[] {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    const startOfWeek = new Date(this.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      this.calendarDays.push({
        date: day,
        dayNumber: day.getDate(),
      });
    }
  }

  loadReservations() {
    this.loading = true;
    this.error = null;

    const startDate = this.getStartDateForView();
    const endDate = this.getEndDateForView();

    this.adminService.getReservationsByDateRange(startDate, endDate).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.error) {
          console.error('Error loading reservations:', result.error);
          this.error = result.error;
        } else {
          this.reservations = result.data || [];
          this.generateCalendarDays();
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading reservations:', error);
        this.error = error;
      },
    });
  }

  previousWeek(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    this.generateCalendarDays();
    this.loadReservations();
  }

  nextWeek(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    this.generateCalendarDays();
    this.loadReservations();
  }

  goToToday(): void {
    this.selectedDate = new Date();
    this.generateCalendarDays();
    this.loadReservations();
  }

  getCurrentWeekRange(): string {
    const startOfWeek = new Date(this.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${endOfWeek.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  getReservationsForDay(date: Date): AdminReservation[] {
    const dateString = date.toISOString().split('T')[0];
    return this.reservations.filter((r) => r.date === dateString);
  }

  getReservationTooltip(reservation: AdminReservation): string {
    let ownerInfo = '';
    if (reservation.owner_name && reservation.owner_name !== 'Unknown') {
      ownerInfo = reservation.owner_name;
      if (reservation.owner_email && reservation.owner_email !== 'No email') {
        ownerInfo += ` (${reservation.owner_email})`;
      }
    } else if (reservation.owner_email && reservation.owner_email !== 'No email') {
      ownerInfo = reservation.owner_email;
    } else {
      ownerInfo = `ID: ${reservation.owner_id.slice(0, 8)}...`;
    }

    return `${reservation.game_mode} - ${reservation.level} - ${reservation.max_participants} participants - Owner: ${ownerInfo}`;
  }

  getOwnerDisplay(reservation: AdminReservation): string {
    if (reservation.owner_name && reservation.owner_name !== 'Unknown') {
      return reservation.owner_name;
    } else if (reservation.owner_email && reservation.owner_email !== 'No email') {
      const email = reservation.owner_email;
      if (email.length > 20) {
        return email.substring(0, 17) + '...';
      }
      return email;
    } else {
      return `${reservation.owner_id.slice(0, 8)}...`;
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.selectedDate.getMonth();
  }

  getGameModeName(gameModeId: string): string {
    return this.gameModes.find((gm) => gm.id === gameModeId)?.name || gameModeId;
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  hasReservationAtTime(date: Date, time: string): boolean {
    const dateString = date.toISOString().split('T')[0];
    const reservations = this.reservations.filter((r) => r.date === dateString);

    return reservations.some((r) => {
      const normalizedTime = this.normalizeTime(r.slot_time);
      const normalizedSlotTime = this.normalizeTime(time);
      return normalizedTime === normalizedSlotTime;
    });
  }

  hasReservationsAtTime(time: string): boolean {
    return this.reservations.some((r) => {
      const normalizedTime = this.normalizeTime(r.slot_time);
      const normalizedSlotTime = this.normalizeTime(time);
      return normalizedTime === normalizedSlotTime;
    });
  }

  getReservationsAtTime(date: Date, time: string): AdminReservation[] {
    const dateString = date.toISOString().split('T')[0];
    return this.reservations.filter((r) => {
      if (r.date === dateString) {
        const normalizedTime = this.normalizeTime(r.slot_time);
        const normalizedSlotTime = this.normalizeTime(time);
        return normalizedTime === normalizedSlotTime;
      }
      return false;
    });
  }

  private normalizeTime(time: string): string {
    if (!time) return '';

    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }

    return time;
  }

  getParticipantCount(reservation: AdminReservation): number {
    return reservation.participants?.length || 0;
  }

  private getStartDateForView(): string {
    const date = new Date(this.selectedDate);
    if (this.viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (this.viewMode === 'week') {
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek;
      date.setDate(diff);
      return date.toISOString().split('T')[0];
    } else {
      date.setDate(1);
      return date.toISOString().split('T')[0];
    }
  }

  private getEndDateForView(): string {
    const date = new Date(this.selectedDate);
    if (this.viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (this.viewMode === 'week') {
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + 6;
      date.setDate(diff);
      return date.toISOString().split('T')[0];
    } else {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      return date.toISOString().split('T')[0];
    }
  }

  getReservationsForSlot(date: string, time: string): any[] {
    const filtered = this.reservations.filter((r) => {
      const reservationTime = r.slot_time.split(':').slice(0, 2).join(':');
      return r.date === date && reservationTime === time;
    });

    return filtered;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'cancelled':
        return 'warn';
      case 'finished':
        return 'primary';
      case 'no-show':
        return 'warn';
      default:
        return 'basic';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'cancelled':
        return 'cancel';
      case 'finished':
        return 'done_all';
      case 'no-show':
        return 'person_off';
      default:
        return 'help';
    }
  }

  previousDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.loadReservations();
  }

  nextDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.loadReservations();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(time: string): string {
    return time;
  }

  getWeekDays(): Date[] {
    const days = [];
    const startOfWeek = new Date(this.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }

  formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  isSelectedDate(date: Date): boolean {
    return date.toDateString() === this.selectedDate.toDateString();
  }

  selectDate(date: Date): void {
    this.selectedDate = date;
    this.loadReservations();
  }

  onViewModeChange(index: number): void {
    const modes: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];
    this.viewMode = modes[index];
    this.loadReservations();
  }

  markAsFinished(reservation: any): void {
    this.adminService.updateReservationStatus(reservation.id, 'finished').subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error('Error updating reservation status:', error);
          this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Reservation marked as finished', 'Close', { duration: 3000 });
          this.loadReservations();
        }
      },
      error: (err) => {
        console.error('Error updating reservation status:', err);
        this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
      },
    });
  }

  markAsNoShow(reservation: any): void {
    this.adminService.updateReservationStatus(reservation.id, 'no-show').subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error('Error updating reservation status:', error);
          this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Reservation marked as no-show', 'Close', { duration: 3000 });
          this.loadReservations();
        }
      },
      error: (err) => {
        console.error('Error updating reservation status:', err);
        this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
      },
    });
  }

  openReservationDetails(reservation: AdminReservation): void {
    const dialogRef = this.dialog.open(ReservationDetailsDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { reservation },
      autoFocus: false,
      restoreFocus: true,
      hasBackdrop: true,
      backdropClass: 'dialog-backdrop',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadReservations();
      }
    });
  }

  getTimeSlotIndex(time: string): number {
    return this.timeSlots.indexOf(time);
  }

  onViewChanged(view: string): void {
    console.log(`Switched to ${view} view`);
  }
}
