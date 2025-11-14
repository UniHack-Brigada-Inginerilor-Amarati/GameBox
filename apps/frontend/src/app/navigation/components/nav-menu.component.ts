import { Component, inject, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { AuthService } from '../../auth/services/auth.service';
import { ProfileService } from '../../profile/services/profile.service';
import { Role, UserProfileDTO } from '@gamebox/shared';

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.scss'],
})
export class NavMenuComponent {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  @Input() position: 'bottom-inline' | 'bottom-fixed' | 'top' = 'bottom-inline';

  get positionClass(): string {
    return `position-${this.position}`;
  }

  readonly isLoggedIn = computed(() => {
    return true;
  });

  admin = false;

  constructor() {
    this.authService.getCurrentUser().subscribe(({ user }: { user: SupabaseUser | null }) => {
      if (!user) {
        this.admin = false;
        return;
      }
      this.profileService.getProfile().subscribe({
        next: (profile: UserProfileDTO) => {
          this.admin = ['admin', 'game-master', 'game-creator', 'moderator'].includes(profile.role);
        },
        error: () => {
          this.admin = false;
        },
      });
    });
  }
}
