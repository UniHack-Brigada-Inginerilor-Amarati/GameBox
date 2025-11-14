import { Injectable } from '@angular/core';
import { AuthError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthErrorHandlerService {
  private readonly registerErrorMessages: Record<string, string> = {
    'User already registered': 'This email is already registered. Please try logging in instead.',
    'Email already in use': 'This email is already registered. Please try logging in instead.',
    'Invalid email': 'Please enter a valid email address.',
    'Weak password': 'Password is too weak. Please choose a stronger password.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Username already in use': 'This username is already taken. Please choose a different one.',
    'Invalid username': 'Username can only contain letters, numbers, and underscores.',
    over_email_send_rate_limit:
      'Too many email requests. Please wait a moment before trying again.',
    'Too many requests': 'Too many requests. Please wait a moment before trying again.',
  };

  private readonly loginErrorMessages: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please check your credentials.',
    'Email not confirmed': 'Email not confirmed. Please check your email and verify your account.',
    'User not found': 'Email does not exist. Please check your email or create an account.',
    'Invalid email or password': 'Invalid email or password. Please check your credentials.',
    'Invalid email': 'Invalid email format. Please check your email address.',
    'Too many requests': 'Too many login attempts. Please try again later.',
  };

  handleRegisterError(error: AuthError): string {
    if (this.registerErrorMessages[error.message]) {
      return this.registerErrorMessages[error.message];
    }

    for (const [key, message] of Object.entries(this.registerErrorMessages)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return error.message || 'Registration failed. Please try again.';
  }

  handleLoginError(error: AuthError): string {
    if (this.loginErrorMessages[error.message]) {
      return this.loginErrorMessages[error.message];
    }

    for (const [key, message] of Object.entries(this.loginErrorMessages)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return error.message || 'Login failed. Please try again.';
  }

  addRegisterErrorMapping(errorKey: string, userMessage: string): void {
    this.registerErrorMessages[errorKey] = userMessage;
  }

  addLoginErrorMapping(errorKey: string, userMessage: string): void {
    this.loginErrorMessages[errorKey] = userMessage;
  }
}
