import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth/services/auth.service';
import { environment } from '../../../environments/environment';
import { AdminReservation, AdminStats } from '@gamebox/shared';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private backendUrl = environment.backendUrl;
  private httpService = inject(HttpService);

  private async getAuthHeaders(): Promise<{ [key: string]: string }> {
    try {
      const { data } = await this.authService.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw new Error('Authentication failed');
    }
  }

  getReservations(): Observable<{ data: AdminReservation[] | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .get<{ success: boolean; data: any[] }>(`${this.backendUrl}/admin/reservations`, {
            headers,
          })
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }

  getReservationsByDateRange(
    startDate: string,
    endDate: string,
  ): Observable<{ data: AdminReservation[] | null; error: any | null }> {
    // For now, just return all reservations. This can be enhanced later with backend filtering
    return this.getReservations().pipe(
      map((result) => {
        if (result.error || !result.data) return result;

        const filteredData = result.data.filter(
          (reservation) => reservation.date >= startDate && reservation.date <= endDate,
        );

        return { data: filteredData, error: null };
      }),
    );
  }

  getAdminStats(): Observable<{ data: AdminStats | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .get<{ success: boolean; data: AdminStats }>(`${this.backendUrl}/admin/stats`, {
            headers,
          })
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }

  updateReservationStatus(
    reservationId: string,
    status: string,
  ): Observable<{ data: any | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .put<{ success: boolean; data: any }>(
            `${this.backendUrl}/admin/reservations/${reservationId}/status`,
            { status },
            { headers },
          )
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }

  deleteReservation(reservationId: string): Observable<{ data: any | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .put<{ success: boolean; data: any }>(
            `${this.backendUrl}/admin/reservations/${reservationId}/delete`,
            {},
            { headers },
          )
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }

  // Note: These methods can be implemented later when needed
  // For now, we focus on the core admin functionality

  getGames(): Observable<{ data: any[] | null; error: any | null }> {
    return of({ data: [], error: null }); // Placeholder
  }

  getUsers(): Observable<{ data: any[] | null; error: any | null }> {
    return of({ data: [], error: null }); // Placeholder
  }

  getReservationParticipants(
    reservationId: string,
  ): Observable<{ data: any[] | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .get<{ success: boolean; data: any[] }>(
            `${this.backendUrl}/admin/reservations/${reservationId}/participants`,
            { headers },
          )
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }

  updateReservation(
    reservationId: string,
    updates: any,
  ): Observable<{ data: any | null; error: any | null }> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http
          .put<{ success: boolean; data: any }>(
            `${this.backendUrl}/admin/reservations/${reservationId}`,
            updates,
            { headers },
          )
          .pipe(
            map((response) => ({ data: response.data, error: null })),
            catchError((error) => of({ data: null, error })),
          ),
      ),
    );
  }
}
