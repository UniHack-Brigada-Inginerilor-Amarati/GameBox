import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  User as SupabaseUser,
  AuthError,
  AuthChangeEvent,
  Session,
  createClient,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabaseService = createClient(environment.supabaseUrl, environment.supabaseKey);

  register(name: string, email: string, password: string): Observable<{ error: AuthError | null }> {
    const payload = {
      email,
      password,
      options: {
        data: {
          name,
          avatar_url: environment.avatarGeneratorUrl + name,
        },
      },
    };
    return from(this.supabaseService.auth.signUp(payload)).pipe(map(({ error }) => ({ error })));
  }

  signInWithPassword(email: string, password: string): Observable<{ error: AuthError | null }> {
    const payload = {
      email,
      password,
    };
    return from(this.supabaseService.auth.signInWithPassword(payload)).pipe(
      map(({ error }) => ({ error })),
    );
  }

  signInWithOTP(email: string): Observable<{ error: AuthError | null }> {
    const payload = {
      email,
      options: {
        shouldCreateUser: true,
      },
    };
    return from(this.supabaseService.auth.signInWithOtp(payload)).pipe(
      map(({ error }) => ({ error })),
    );
  }

  googleSignIn(): Observable<{ error: AuthError | null }> {
    const nonce = this.generateNonce();

    return from(
      this.supabaseService.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            nonce: nonce,
          },
        },
      }),
    ).pipe(map(({ error }) => ({ error })));
  }

  private generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  signOut(
    scope: 'global' | 'local' | 'others' = 'global',
  ): Observable<{ error: AuthError | null }> {
    return from(this.supabaseService.auth.signOut({ scope })).pipe(map(({ error }) => ({ error })));
  }

  requestResetPasswordEmail(
    email: string,
    redirectUrl: string,
  ): Observable<{ error: AuthError | null }> {
    return from(
      this.supabaseService.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      }),
    ).pipe(map(({ error }) => ({ error })));
  }

  updatePassword(newPassword: string): Observable<{ error: AuthError | null }> {
    return from(
      this.supabaseService.auth.updateUser({
        password: newPassword,
      }),
    ).pipe(map(({ error }) => ({ error })));
  }

  getSession() {
    return this.supabaseService.auth.getSession();
  }

  refreshSession() {
    return this.supabaseService.auth.refreshSession();
  }

  getCurrentUser(): Observable<{ user: SupabaseUser | null }> {
    return from(this.supabaseService.auth.getUser()).pipe(
      map(({ data }) => ({ user: data.user || null })),
    );
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabaseService.auth.getSession();
    return !!data.session;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return new Observable<{ event: AuthChangeEvent; session: Session | null }>((observer) => {
      const {
        data: { subscription },
      } = this.supabaseService.auth.onAuthStateChange((event, session) => {
        callback(event, session);
        observer.next({ event, session });
      });

      return () => subscription.unsubscribe();
    });
  }
}
