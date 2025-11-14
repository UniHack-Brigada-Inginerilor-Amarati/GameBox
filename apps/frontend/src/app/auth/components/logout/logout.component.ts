import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { take, finalize } from 'rxjs/operators';
import { AuthFormBase, snackbarConfig } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent extends AuthFormBase {
  isLoggingOut = false;

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    this.performLogout();
  }

  private performLogout(): void {
    this.isLoggingOut = true;
    
    this.authService.signOut().pipe(
      take(1),
      finalize(() => {
        this.isLoggingOut = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.error) {
          console.error('Logout error:', response.error);
          this.matSnackBar.open('Logout failed. Please try again.', 'Close', snackbarConfig);
        } else {
          this.matSnackBar.open('Successfully logged out', 'Close', snackbarConfig);
        }
        this.goToLanding();
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.matSnackBar.open('Logout failed. Please try again.', 'Close', snackbarConfig);
        this.goToLanding();
      }
    });
  }
} 