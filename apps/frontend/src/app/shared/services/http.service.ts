import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable, OnDestroy } from "@angular/core";
import { from, Observable, Subject } from "rxjs";
import { catchError, switchMap, takeUntil } from "rxjs/operators";
import { AuthService } from "../../auth/services/auth.service";
import { Router } from "@angular/router";

@Injectable({
  providedIn: 'root'
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
    this.authService.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        this.updateAuthToken(session.access_token, session.expires_at ?? 0);
      } else {
        this.clearAuthToken();
      }
    }).pipe(takeUntil(this.destroy$)).subscribe();

    this.initializeToken();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeToken() {
    try {
      const { data: { session } } = await this.authService.getSession();
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
    return Date.now() > (this.tokenExpiry * 1000) - refreshThreshold;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.isTokenExpired() && !this.isRefreshing) {
      this.isRefreshing = true;
      
      try {
        const { data: { session }, error } = await this.authService.refreshSession();
        if (error) {
          this.clearAuthToken();
          throw error;
        }
        
        if (session?.access_token) {
          this.updateAuthToken(session.access_token, session.expires_at ?? 0);
          this.refreshSub$.next(session.access_token);
        }
      } catch (error) {
        this.clearAuthToken();
        throw error;
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
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    });
  }

  private getBasicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
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
      catchError(error => {
        if (error.status === 401) {
          console.error('401 Unauthorized - clearing auth token');
          this.clearAuthToken();
          this.router.navigate(['/']);
        }
        throw error;
      })
    );
  }

  put<T>(url: string, body: T, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.put<T>(url, body, { ...options, headers });
      }),
      catchError(error => {
        if (error.status === 401) {
          console.error('401 Unauthorized - clearing auth token');
          this.clearAuthToken();
          this.router.navigate(['/']);
        }
        throw error;
      })
    );
  }

  post<T>(url: string, body: any, options?: { headers?: HttpHeaders; skipAuth?: boolean }): Observable<T> {
    // If skipAuth is true, make the request without authentication
    if (options?.skipAuth) {
      const headers = this.getBasicHeaders();
      return this.http.post<T>(url, body, { ...options, headers });
    }
    
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        
        if (body instanceof FormData) {
          return this.http.post<T>(url, body, { ...options, headers: new HttpHeaders({
            'Authorization': `Bearer ${this.authToken}`
          })});
        }
        return this.http.post<T>(url, body, { ...options, headers });
      }),
      catchError(error => {
        if (error.status === 401) {
          console.error('401 Unauthorized - clearing auth token');
          this.clearAuthToken();
          this.router.navigate(['/']);
        }
        throw error;
      })
    );
  }

  delete<T>(url: string, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.delete<T>(url, { ...options, headers });
      }),
      catchError(error => {
        if (error.status === 401) {
          console.error('401 Unauthorized - clearing auth token');
          this.clearAuthToken();
          this.router.navigate(['/']);
        }
        throw error;
      })
    );
  }

  patch<T>(url: string, body: T, options?: { headers?: HttpHeaders }): Observable<T> {
    return from(this.refreshTokenIfNeeded()).pipe(
      switchMap(() => {
        const headers = this.getAuthHeaders();
        return this.http.patch<T>(url, body, { ...options, headers });
      }),
      catchError(error => {
        if (error.status === 401) {
          console.error('401 Unauthorized - clearing auth token');
          this.clearAuthToken();
          this.router.navigate(['/']);
        }
        throw error;
      })
    );
  }
}

