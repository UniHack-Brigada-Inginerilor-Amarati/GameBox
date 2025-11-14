import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate() {
    return this.authService.getCurrentUser().pipe(
      take(1),
      map(({ user }) => {
        if (!user) {
          this.router.navigate(['/']);
          return false;
        }

        const isEmailConfirmed = user.email_confirmed_at;
        const isGoogleUser = user.app_metadata?.provider === 'google';

        if (!isEmailConfirmed && !isGoogleUser) {
          this.router.navigate(['/auth/verify-email']);
          return false;
        }

        return true;
      })
    );
  }
}
