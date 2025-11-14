import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthError } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { AuthFormBase } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-forgot-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent extends AuthFormBase {
  readonly emailSent = signal(false);
  readonly resetPasswordUrl = `${environment.frontendUrl}/auth/reset-password`;

  readonly forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  override get form(): FormGroup {
    return this.forgotPasswordForm;
  }

  onSubmit(): void {
    const { email } = this.forgotPasswordForm.value;

    if (this.forgotPasswordForm.invalid || !email)
      return;

    this.setLoadingState(true);

    this.authService.requestResetPasswordEmail(email, this.resetPasswordUrl).subscribe({
      next: () => {
        this.setLoadingState(false);
        this.emailSent.set(true);
      },
      error: (error: AuthError) => {
        this.setLoadingState(false);
        this.errorMessage.set(error.message);
      }
    });
  }

  // Reset form and clear emailSent signal
  onResendEmail(): void {
    this.emailSent.set(false);
    this.resetForm();
  }
}
