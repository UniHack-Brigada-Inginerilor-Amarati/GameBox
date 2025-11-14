import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthError } from '@supabase/supabase-js';
import { GoogleLoginButtonComponent } from '..//google-login-button/google-login-button.component';
import { ValidationService } from '../../services/validation.service';
import { AuthErrorHandlerService } from '../../services/auth-error.service';
import { AuthFormBase, snackbarConfig } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    GoogleLoginButtonComponent,
  ],
})
export class LoginComponent extends AuthFormBase {
  private errorHandler = inject(AuthErrorHandlerService);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  override get form(): FormGroup {
    return this.loginForm;
  }

  onSubmit(): void {
    this.setSubmittedState();
    this.clearError(this.errorMessage);

    const { email, password } = this.loginForm.value;

    if (this.loginForm.invalid || !email || !password) return;

    this.setLoadingState(true);

    this.authService.signInWithPassword(email, password).subscribe({
      next: (response) => {
        if (response.error) {
          this.setLoadingState(false);
          this.handleLoginError(response.error);
        } else {
          this.resetFormState();
          this.goToProfile();

          this.matSnackBar.open('Login successful', 'Close', snackbarConfig);
        }
      },
      error: (error) => {
        this.setLoadingState(false);
        this.matSnackBar.open('Login failed. Please try again.', 'Close', snackbarConfig);
      },
    });
  }

  onGoogleLogin(): void {
    this.setSubmittedState();
    this.setGoogleLoadingState(true);

    this.authService.googleSignIn().subscribe({
      next: (response) => {
        if (response.error) {
          this.setGoogleLoadingState(false);
          this.handleLoginError(response.error);
        } else {
          this.resetFormState();
          this.goToProfile();
          this.matSnackBar.open('Google login successful', 'Close', snackbarConfig);
        }
      },
      error: (error) => {
        this.setGoogleLoadingState(false);
        this.matSnackBar.open('Google login failed. Please try again.', 'Close', snackbarConfig);
      },
    });
  }

  private handleLoginError(error: AuthError): void {
    const message = this.errorHandler.handleLoginError(error);
    this.errorMessage.set(message);
  }

  onInputChange(): void {
    this.clearError(this.errorMessage);
  }
}
