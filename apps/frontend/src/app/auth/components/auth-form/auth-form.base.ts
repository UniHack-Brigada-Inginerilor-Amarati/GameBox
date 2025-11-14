import { inject, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { emailErrorMessages, passwordErrorMessages, confirmPasswordErrorMessages, usernameErrorMessages } from '../../services/validation.service';

// Type for error signals used across auth components
type ErrorSignal = WritableSignal<string | null>;

// Snackbar config
export const snackbarConfig: MatSnackBarConfig = {
  duration: 3000,
  horizontalPosition: 'center',
  verticalPosition: 'bottom'
};

// Base Class for authentication forms with common getters and error handling
export abstract class AuthFormBase {

  // !SERVICES!
  protected fb = inject(FormBuilder);
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected authService = inject(AuthService);
  protected matSnackBar = inject(MatSnackBar);

  // !COMMON SIGNALS!
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly isGoogleLoading = signal(false);

  // Form getter for base class
  get form(): FormGroup{
    return this.fb.group({});
  }

  // !FORM CONTROLS GETTERS!
  protected getFormControl(controlName: string): FormControl {
    return this.form.get(controlName) as FormControl;
  }

  get username(): FormControl {
    return this.getFormControl('username');
  }

  get email(): FormControl {
    return this.getFormControl('email');
  }

  get password(): FormControl {
    return this.getFormControl('password');
  }

  get confirmPassword(): FormControl {
    return this.getFormControl('confirmPassword');
  }

  // !PASSWORD VISIBILITY TOGGLES!
  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(show => !show);
  }

  // !FORM STATE MANAGEMENT!
  protected setSubmittedState(): void {
    this.submitted.set(true);
  }

  protected setLoadingState(loading: boolean): void {
    this.isLoading.set(loading);
  }

  protected setGoogleLoadingState(loading: boolean): void {
    this.isGoogleLoading.set(loading);
  }

  protected resetFormState(): void {
    this.submitted.set(false);
    this.isLoading.set(false);
  }

  protected resetForm(): void {
    this.resetFormState();
    this.form.reset();
  }

  protected clearError(errorSignal: ErrorSignal): void {
    if (errorSignal && typeof errorSignal.set === 'function') {
      errorSignal.set(null);
    }
  }

  protected handleHttpError(error: HttpErrorResponse, errorSignal: ErrorSignal, errorMessages: Record<number, string>): void {
    const status = error.status || 0;
    const message = errorMessages[status] || 'An error occurred. Please try again.';
    errorSignal.set(message);
  }


  get emailErrors(): string[] {
    return this.getErrors('email', emailErrorMessages);
  }

  private getErrors(formField: string, errorMessages: Record<string, string>): string[] {
    const errors: string[] = [];
    const control = this.getFormControl(formField);

    if (control?.errors) {
      Object.keys(control.errors).forEach(errorKey => {
        if (errorMessages[errorKey]) {
          errors.push(errorMessages[errorKey]);
        }
      });
    }

    return errors;
  }

  get usernameErrors(): string[] {
    return this.getErrors('username', usernameErrorMessages);
  }
 
  get passwordErrors(): string[] {
    return this.getErrors('password', passwordErrorMessages);
  }

  get confirmPasswordErrors(): string[] {
    const errors: string[] = this.getErrors('confirmPassword', confirmPasswordErrorMessages);
    
    const control = this.getFormControl('confirmPassword');

    if (
      this.form.hasError('fieldsMismatch') &&
      (control?.touched || this.submitted())
    ) {
      errors.push('Passwords do not match');
    }
    return errors;
  }


  getControlErrors(controlName: string, errorMessages: Record<string, string>): string[] {
    const errors: string[] = [];
    const control = this.getFormControl(controlName);

    if (control?.errors) {
      Object.keys(control.errors).forEach(errorKey => {
        if (errorMessages[errorKey]) {
          errors.push(errorMessages[errorKey]);
        }
      });
    }

    return errors;
  }
  
 
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }


  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  goToVerifyEmail(): void {
    this.router.navigate(['/auth/verify-email']);
  }

  goToResetPassword(): void {
    this.router.navigate(['/auth/reset-password']);
  }

  goToProfile(): void {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToLanding(): void {
    this.router.navigate(['/']);
  }
}