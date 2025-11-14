import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthError } from '@supabase/supabase-js';
import { GoogleLoginButtonComponent } from '../google-login-button/google-login-button.component';
import { ValidationService } from '../../services/validation.service';
import { AuthErrorHandlerService } from '../../services/auth-error.service';
import { AuthFormBase, snackbarConfig } from '../auth-form/auth-form.base';

@Component({
  selector: 'app-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    GoogleLoginButtonComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent extends AuthFormBase {
  private errorHandler = inject(AuthErrorHandlerService);

  readonly registerForm = this.fb.group({
    username: ['', [Validators.required, ValidationService.usernameRules()]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]], // TODO: add password rules later with ValidationService.strongPassword()
    confirmPassword: ['', [Validators.required]],
  }, { validators: ValidationService.matchFields('password', 'confirmPassword') });

  override get form(): FormGroup {
    return this.registerForm;
  }
  
  onSubmit(): void {
    this.setSubmittedState();
    this.clearError(this.errorMessage);

    const { username, email, password } = this.registerForm.value;

    if (this.registerForm.invalid || !email || !password || !username)
      return;

    this.setLoadingState(true);

    this.authService
      .register(username, email, password)
      .subscribe({
        next: (response) => {
          if (response.error) {
            this.setLoadingState(false);
            this.handleRegisterError(response.error);
          } else {
            this.resetFormState();
            this.goToVerifyEmail();
            this.matSnackBar.open('Registration successful! Please check your email to confirm your account.', 'Close', snackbarConfig);
          }
        },
        error: (error) => {
          this.setLoadingState(false);
          this.errorMessage.set('Registration failed. Please try again.');
          this.matSnackBar.open('Registration failed. Please try again.', 'Close', snackbarConfig);
        }
    });
  }

  private handleRegisterError(error: AuthError): void {
    const message = this.errorHandler.handleRegisterError(error);
    this.errorMessage.set(message);
  }

  onGoogleRegister(): void {
    this.setSubmittedState();
    this.setGoogleLoadingState(true);
    
    this.authService
      .googleSignIn()
      .subscribe({
        next: (response) => {
          if (response.error) {
            this.setGoogleLoadingState(false);
            this.handleRegisterError(response.error);
          } else {
            this.goToProfile();
            this.matSnackBar.open('Google registration successful', 'Close', snackbarConfig);
          }
        },
        error: (error) => {
          this.setGoogleLoadingState(false);
          this.errorMessage.set('Google registration failed. Please try again.');
          this.matSnackBar.open('Google registration failed. Please try again.', 'Close', snackbarConfig);
        }
      });
  }
}
