import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { AuthFormBase } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss'
})
export class OAuthCallbackComponent extends AuthFormBase implements OnInit {

  ngOnInit() {
    this.handleOAuthCallback();
  }

  private handleOAuthCallback() {
    setTimeout(() => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: ({ user }) => {
          if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const nextUrl = urlParams.get('next');
            
            if (nextUrl === '/auth/reset-password') {
              this.goToResetPassword();
              return;
            }
            
            if (user.email_confirmed_at || user.app_metadata?.provider === 'google') {
              this.goToProfile();
            } else {
              this.goToVerifyEmail();
            }
          } else {
            this.goToLogin();
          }
        },
        error: (error) => {
          if (error.message?.includes('NavigatorLockAcquireTimeoutError')) {
            setTimeout(() => {
              this.handleOAuthCallback();
            }, 2000);
          } else {
            this.goToLogin();
          }
        }
      });
    }, 1500);
  }
} 