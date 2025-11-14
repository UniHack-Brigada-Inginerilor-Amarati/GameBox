import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs/operators';
import { AuthFormBase } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})

export class VerifyEmailComponent extends AuthFormBase implements OnInit {

  userEmail = '';
  isResending = false;
  isChecking = false;
  message = '';
  isError = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.userEmail = params['email'];
        this.message = 'Please check your email and click the verification link to continue.';
        return;
      }
    });

    if (!this.userEmail) {
      this.authService.getCurrentUser().pipe(take(1)).subscribe(({ user }) => {
        if (user && user.email) {
          this.userEmail = user.email;
          this.message = 'Please check your email and click the verification link to continue.';
        } else {
          this.goToLogin();
        }
      });
    }
  }

  resendVerification() {
    this.isResending = true;
    this.message = '';
    
    this.authService.signInWithOTP(this.userEmail).subscribe(({ error }) => {
      this.isResending = false;
      if (error) {
        this.message = 'Failed to resend verification email. Please try again.';
        this.isError = true;
      } else {
        this.message = 'Verification email sent successfully! Please check your inbox.';
        this.isError = false;
      }
    });
  }

  checkVerification() {
    this.isChecking = true;
    this.message = '';
    
    this.authService.getCurrentUser().pipe(take(1)).subscribe(({ user }) => {
      this.isChecking = false;
      if (user && user.email_confirmed_at) {
        this.message = 'Email verified successfully! Redirecting to dashboard...';
        this.isError = false;
        this.goToProfile();
      } else {
        this.message = 'Email not yet verified. Please check your inbox and click the verification link.';
        this.isError = true;
      }
    });
  }
} 