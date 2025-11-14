import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AdminStats } from '@gamebox/shared';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: false,
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats | null = null;
  loading = true;
  error: any = null;

  private router = inject(Router);
  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.loadAdminStats();
  }

  navigateToCalendar(): void {
    this.router.navigate(['/admin/calendar']);
  }

  navigateToReservations(): void {
    this.router.navigate(['/admin/reservations']);
  }

  loadAdminStats(): void {
    this.loading = true;
    this.error = null;

    this.adminService.getAdminStats().subscribe({
      next: ({ data, error }) => {
        this.loading = false;
        if (error) {
          this.error = error;
          console.error('Error loading admin stats:', error);
        } else {
          this.stats = data;
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err;
        console.error('Error loading admin stats:', err);
      },
    });
  }

  onViewChanged(view: string): void {
    console.log(`Switched to ${view} view`);
  }
}
