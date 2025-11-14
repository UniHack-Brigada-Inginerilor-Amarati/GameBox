import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../services/admin.service';
import { GAME_MODES } from '@gamebox/shared';
import { ReservationDeleteDialogComponent } from '../reservation-delete-dialog/reservation-delete-dialog.component';

export interface AdminReservationUI {
  id: string;
  owner_id: string;
  slot_time: string;
  date: string;
  game_mode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  is_public: boolean;
  max_participants: number;
  participants: Array<{
    reservation_id: string;
    user_id: string;
    confirmed: boolean;
  }>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show';
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
}

@Component({
  selector: 'app-admin-reservations',
  templateUrl: './admin-reservations.component.html',
  styleUrls: ['./admin-reservations.component.scss'],
  standalone: false,
})
export class AdminReservationsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'game_mode',
    'date',
    'slot_time',
    'level',
    'owner',
    'participants',
    'status',
    'created_at',
    'actions',
  ];

  dataSource: MatTableDataSource<AdminReservationUI>;
  reservations: AdminReservationUI[] = [];
  filteredReservations: AdminReservationUI[] = [];
  loading = false;
  error: any = null;
  gameModes = GAME_MODES;

  filters = {
    date: '',
    status: '',
    gameMode: '',
  };

  currentPage = 1;
  pageSize = 10;

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'finished', label: 'Finished' },
    { value: 'no-show', label: 'No-Show' },
  ];

  gameModeOptions = [
    { value: '', label: 'All Games' },
    ...GAME_MODES.map((gm) => ({ value: gm.id, label: gm.name })),
  ];

  Math = Math;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  constructor() {
    this.dataSource = new MatTableDataSource<AdminReservationUI>([]);
  }

  ngOnInit(): void {
    this.loadReservations();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadReservations(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getReservations().subscribe({
      next: ({ data, error }) => {
        this.loading = false;
        if (error) {
          console.error('Error loading reservations:', error);
          this.error = error;
          this.snackBar.open('Failed to load reservations', 'Close', { duration: 3000 });
          this.reservations = [];
        } else {
          this.reservations = this.transformSupabaseReservations(data || []);
          this.filteredReservations = [...this.reservations];
        }
        this.dataSource.data = this.reservations;
      },
      error: (err) => {
        this.loading = false;
        this.error = err;
        console.error('Error loading reservations:', err);
        this.snackBar.open('Failed to load reservations', 'Close', { duration: 3000 });
        this.reservations = [];
        this.dataSource.data = this.reservations;
      },
    });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage * this.pageSize < this.filteredReservations.length) {
      this.currentPage++;
    }
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.filteredReservations = this.reservations.filter((r) => {
      let matches = true;

      if (this.filters.date && r.date !== this.filters.date) {
        matches = false;
      }

      if (this.filters.status && r.status !== this.filters.status) {
        matches = false;
      }

      if (this.filters.gameMode && r.game_mode !== this.filters.gameMode) {
        matches = false;
      }

      return matches;
    });
  }

  clearFilters(): void {
    this.filters = {
      date: '',
      status: '',
      gameMode: '',
    };
    this.currentPage = 1;
    this.filteredReservations = [...this.reservations];
  }

  private transformSupabaseReservations(supabaseReservations: any[]): AdminReservationUI[] {
    return supabaseReservations.map((reservation) => ({
      id: reservation.id,
      owner_id: reservation.owner_id,
      slot_time: reservation.slot_time,
      date: reservation.date,
      game_mode: reservation.game_mode,
      level: reservation.level,
      is_public: reservation.is_public || false,
      max_participants: reservation.max_participants,
      participants: reservation.participants || [],
      status: this.mapStatusToUI(reservation.status),
      created_at: reservation.created_at,
      updated_at: reservation.updated_at,
      owner_name: reservation.owner_name || 'Unknown',
      owner_email: reservation.owner_email || 'No email',
    }));
  }

  private mapStatusToUI(
    supabaseStatus: string,
  ): 'pending' | 'confirmed' | 'cancelled' | 'finished' | 'no-show' {
    switch (supabaseStatus) {
      case 'confirmed':
        return 'confirmed';
      case 'pending':
        return 'pending';
      case 'cancelled':
        return 'cancelled';
      case 'finished':
        return 'finished';
      case 'no-show':
        return 'no-show';
      default:
        return 'pending';
    }
  }

  mapStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      case 'finished':
        return 'Finished';
      case 'no-show':
        return 'No Show';
      default:
        return status;
    }
  }

  getGameModeName(gameModeId: string): string {
    return this.gameModes.find((gm) => gm.id === gameModeId)?.name || gameModeId;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'finished':
        return 'warn';
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
      case 'finished':
        return 'done_all';
      case 'no-show':
        return 'cancel';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getConfirmedParticipantsCount(participants: any[]): number {
    return participants.filter((p) => p.confirmed).length;
  }

  markAsFinished(reservation: AdminReservationUI) {
    this.updateReservationStatus(reservation, 'finished');
  }

  markAsNoShow(reservation: AdminReservationUI) {
    this.updateReservationStatus(reservation, 'no-show');
  }

  confirmReservation(reservation: AdminReservationUI) {
    this.updateReservationStatus(reservation, 'confirmed');
  }

  cancelReservation(reservation: AdminReservationUI) {
    this.updateReservationStatus(reservation, 'cancelled');
  }

  deleteReservation(reservation: AdminReservationUI) {
    const dialogRef = this.dialog.open(ReservationDeleteDialogComponent, {
      width: '400px',
      data: { reservation },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.performDelete(reservation);
      }
    });
  }

  private performDelete(reservation: AdminReservationUI) {
    this.adminService.deleteReservation(reservation.id).subscribe({
      next: (result) => {
        if (result.error) {
          console.error('Error deleting reservation:', result.error);
        } else {
          this.loadReservations();
        }
      },
      error: (error) => {
        console.error('Error deleting reservation:', error);
      },
    });
  }

  updateReservationStatus(reservation: AdminReservationUI, newStatus: string): void {
    this.adminService.updateReservationStatus(reservation.id, newStatus).subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error('Error updating reservation status:', error);
          this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(`Reservation status updated to ${newStatus}`, 'Close', {
            duration: 3000,
          });
          this.loadReservations();
        }
      },
      error: (err) => {
        console.error('Error updating reservation status:', err);
        this.snackBar.open('Failed to update reservation status', 'Close', { duration: 3000 });
      },
    });
  }

  exportReservations(): void {
    this.snackBar.open('Export functionality coming soon!', 'Close', { duration: 3000 });
  }

  onViewChanged(view: string): void {
    console.log(`Switched to ${view} view`);
  }
}
