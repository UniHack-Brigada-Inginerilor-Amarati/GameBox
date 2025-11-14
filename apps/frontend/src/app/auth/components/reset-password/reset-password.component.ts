import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthError } from '@supabase/supabase-js';
import { ValidationService } from '../../services/validation.service';
import { AuthFormBase, snackbarConfig } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-reset-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent extends AuthFormBase implements OnInit {
  readonly passwordReset = signal(false);
  readonly tokenInvalid = signal(false);
  readonly resetToken = signal('');

  readonly resetPasswordForm = this.fb.group({
    password: ['', [Validators.required, ValidationService.strongPassword()]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: ValidationService.matchFields('password', 'confirmPassword') });

  override get form(): FormGroup {
    return this.resetPasswordForm;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.resetToken.set(token);
      }
    });

    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        this.resetToken.set(accessToken);
      }
    }

    if (!this.resetToken()) {
      this.authService.getCurrentUser().subscribe({
        next: ({ user }) => {
          if (user) {
            this.resetToken.set('authenticated');
            this.matSnackBar.open('User authenticated. Proceeding with password reset.', 'Close', snackbarConfig);
          } else {
            this.tokenInvalid.set(true);
            this.matSnackBar.open('Error checking user authentication. Please try again.', 'Close', snackbarConfig);
          }
        },
        error: (error) => {
          console.error('Error checking user authentication:', error);
          this.tokenInvalid.set(true);
          this.matSnackBar.open('Error checking user authentication. Please try again.', 'Close', snackbarConfig);
        }
      });
    }
  }

  onSubmit(): void {
    this.setSubmittedState();
    
    if (this.resetPasswordForm.valid && this.resetToken()) {
      this.setLoadingState(true);
      
      const { password } = this.resetPasswordForm.value;
      
      if (!password) return;
      
      this.authService.updatePassword(password).subscribe({
        next: () => {
          this.setLoadingState(false);
          this.passwordReset.set(true);
          this.matSnackBar.open('Password reset successful', 'Close', snackbarConfig);
        },
        error: (error: AuthError) => {
          this.setLoadingState(false);
          console.error('Password reset failed:', error);
          this.matSnackBar.open('Password reset failed. Please try again.', 'Close', snackbarConfig);
          if (error.status === 400) {
            this.tokenInvalid.set(true);
          }
        }
      });
    }
  }
}
