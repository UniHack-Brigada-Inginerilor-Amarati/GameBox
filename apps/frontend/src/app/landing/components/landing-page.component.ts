import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { Session } from '@supabase/supabase-js';
import { ProfileService } from '../../profile/services/profile.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private authSubscription?: Subscription;

  readonly session = signal<Session | null>(null);
  readonly isLoggedIn = signal(false);
  readonly isAuthenticated = signal(false);
  readonly isLoading = signal(true);
  admin = false;

  ngOnInit() {
    this.checkAuthState();

    this.authSubscription = this.authService
      .onAuthStateChange((event, session) => {
        this.session.set(session);
        this.isLoggedIn.set(!!session);
        this.isAuthenticated.set(!!session);
        this.isLoading.set(false);

        if (session) {
          this.checkAdminStatus();
        } else {
          this.admin = false;
        }
      })
      .subscribe();
  }

  private async checkAuthState() {
    try {
      const isAuth = await this.authService.isAuthenticated();
      this.isAuthenticated.set(isAuth);

      const { data } = await this.authService.getSession();
      this.session.set(data.session);
      this.isLoggedIn.set(!!data.session);

      if (!data.session || !data.session.access_token) {
        this.isAuthenticated.set(false);
        this.isLoggedIn.set(false);
      }

      this.isLoading.set(false);

      if (data.session) {
        this.checkAdminStatus();
      }
    } catch {
      this.isAuthenticated.set(false);
      this.isLoggedIn.set(false);
      this.isLoading.set(false);
    }
  }

  private async checkAdminStatus() {
    try {
      const profile = await firstValueFrom(this.profileService.getProfile());

      if (profile) {
        this.admin = ['admin', 'game-master', 'game-creator', 'moderator'].includes(profile.role);
      }
    } catch {
      this.admin = false;
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
