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

  private async handleOAuthCallback() {
    try {
      // First, wait for Supabase to process the OAuth callback from URL hash
      // Supabase automatically processes the hash when the page loads
      // We need to wait a bit for it to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if we have a session (Supabase should have processed the hash by now)
      const { data: sessionData } = await this.authService.getSession();
      
      if (sessionData?.session) {
        // Session exists, get the user
        this.authService.getCurrentUser().pipe(take(1)).subscribe({
          next: ({ user }) => {
            if (user) {
              const urlParams = new URLSearchParams(window.location.search);
              const nextUrl = urlParams.get('next');
              
              if (nextUrl === '/auth/reset-password') {
                this.goToResetPassword();
                return;
              }
              
              // Google OAuth users are automatically confirmed
              if (user.email_confirmed_at || user.app_metadata?.provider === 'google') {
                this.goToProfile();
              } else {
                this.goToVerifyEmail();
              }
            } else {
              console.error('No user found after OAuth callback');
              this.goToLogin();
            }
          },
          error: (error) => {
            console.error('Error getting user after OAuth callback:', error);
            if (error.message?.includes('NavigatorLockAcquireTimeoutError')) {
              // Retry after a delay
              setTimeout(() => {
                this.handleOAuthCallback();
              }, 2000);
            } else {
              this.goToLogin();
            }
          }
        });
      } else {
        // No session found, check URL for error parameters
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          this.matSnackBar.open(
            `OAuth error: ${errorDescription || error}`,
            'Close',
            { duration: 5000 }
          );
        }
        
        // Retry once more in case Supabase is still processing
        setTimeout(() => {
          this.handleOAuthCallback();
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      this.goToLogin();
    }
  }
} 