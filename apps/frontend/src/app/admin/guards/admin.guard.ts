import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminRoles } from '@gamebox/shared';
import { ProfileService } from '../../profile/services/profile.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private profileService = inject(ProfileService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.profileService.getProfile().pipe(
      map((profile) => {
        const isAdmin = AdminRoles.includes(profile.role);

        if (!isAdmin) {
          this.router.navigate(['/profiles/me']);
        }

        return isAdmin;
      }),
      catchError((error) => {
        console.error('Error checking admin role:', error);
        this.router.navigate(['/profiles/me']);
        return of(false);
      }),
    );
  }
}
