import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { from, Observable, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class HttpService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private destroy$ = new Subject<void>();
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;
  private isRefreshing = false;
  private refreshSub$ = new Subject<string>();
  private router = inject(Router);

  constructor() {
    this.authService
      .onAuthStateChange((event, session) => {
        if (session?.access_token) {
          this.updateAuthToken(session.access_token, session.expires_at ?? 0);
        } else {
          this.clearAuthToken();
        }
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.initializeToken();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeToken() {
    try {
      const {
        data: { session },
      } = await this.authService.getSession();
      if (session?.access_token) {
        this.updateAuthToken(session.access_token, session.expires_at ?? 0);
      }
    } catch (error) {
      console.error('Failed to initialize auth token:', error);
    }
  }

  private updateAuthToken(token: string, expiresAt: number) {
    this.authToken = token;
    this.tokenExpiry = expiresAt;
  }

  private clearAuthToken() {
    this.authToken = null;
    this.tokenExpiry = null;
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;

    const refreshThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() > this.tokenExpiry * 1000 - refreshThreshold;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    // If token doesn't exist at all, try to get it from the session
    if (!this.authToken) {
      try {
        const {
          data: { session },
        } = await this.authService.getSession();
        if (session?.access_token) {
          this.updateAuthToken(session.access_token, session.expires_at ?? 0);
          return;
        }
      } catch (error) {
        console.error('Failed to get session for token initialization:', error);
        throw new Error('No authentication token available');
      }
    }

    // If token is expired, try to refresh it
    if (this.isTokenExpired() && !this.isRefreshing) {
      this.isRefreshing = true;

      try {
        const {
          data: { session },
          error,
        } = await this.authService.refreshSession();
        if (error) {
          console.error('Token refresh failed:', error);
          this.clearAuthToken();
          throw new Error('Token refresh failed: ' + (error.message || 'Unknown error'));
        }

        if (session?.access_token) {
          this.updateAuthToken(session.access_token, session.expires_at ?? 0);
          this.refreshSub$.next(session.access_token);
        } else {
          console.error('Token refresh returned no access token');
          this.clearAuthToken();
          throw new Error('Token refresh returned no access token');
        }
      } catch (error) {
        this.clearAuthToken();
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Token refresh failed');
      } finally {
        this.isRefreshing = false;
      }
    }
  }

  private getAuthHeaders(): HttpHeaders {
    if (!this.authToken) {
      throw new Error('No auth token available');
    }

    return new HttpHeaders({
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    });
  }

  private getBasicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  /**
   * Handles HTTP errors, distinguishing between authentication and authorization failures.
   * Only redirects on true authentication failures (no token available).
   */
  private handleHttpError(error: HttpErrorResponse | Error): never {
    // Check if it's an HttpErrorResponse
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        console.error('401 Unauthorized - authentication failed');
        // Only redirect if we truly have no token (user is not authenticated)
        // Otherwise, let components handle the error (might be expired token, etc.)
        if (!this.authToken) {
          this.clearAuthToken();
          this.router.navigate(['/']);
        } else {
          // Token exists but request failed - might be expired or invalid
          // Clear token but let component handle the error
          this.clearAuthToken();
        }
      } else if (error.status === 403) {
        console.error('403 Forbidden - insufficient permissions');
        // Don't redirect on 403 - it's an authorization issue, not authentication
      }
    } else {
      // Handle non-HTTP errors (e.g., from refreshTokenIfNeeded)
      console.error('Non-HTTP error:', error);
    }
    throw error;
  }

  get<T>(url: string, options?: { headers?: HttpHeaders; skipAuth?: boolean }): Observable<T> {
    if (options?.skipAuth) {
      const headers = this.getBasicHeaders();
      return this.http.get<T>(url, { ...options, headers });
    }

    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.get<T>(url, { ...options, headers });
      }),
      catchError((error) => {
        this.handleHttpError(error);
      }),
    );
  }

  put<T>(url: string, body: T, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.put<T>(url, body, { ...options, headers });
      }),
      catchError((error) => {
        this.handleHttpError(error);
      }),
    );
  }

  post<T>(
    url: string,
    body: unknown,
    options?: { headers?: HttpHeaders; skipAuth?: boolean },
  ): Observable<T> {
    // If skipAuth is true, make the request without authentication
    if (options?.skipAuth) {
      const headers = this.getBasicHeaders();
      return this.http.post<T>(url, body, { ...options, headers });
    }

    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();

        if (body instanceof FormData) {
          return this.http.post<T>(url, body, {
            ...options,
            headers: new HttpHeaders({
              Authorization: `Bearer ${this.authToken}`,
            }),
          });
        }
        return this.http.post<T>(url, body, { ...options, headers });
      }),
      catchError((error) => {
        this.handleHttpError(error);
      }),
    );
  }

  delete<T>(url: string, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.delete<T>(url, { ...options, headers });
      }),
      catchError((error) => {
        this.handleHttpError(error);
      }),
    );
  }

  patch<T>(url: string, body: T, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.patch<T>(url, body, { ...options, headers });
      }),
      catchError((error) => {
        this.handleHttpError(error);
      }),
    );
  }
}
