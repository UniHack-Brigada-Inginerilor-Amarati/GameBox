import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Reservation,
  CreateReservationRequest,
  TimeSlot,
} from '@gamebox/shared';
import { HttpService } from '../../shared/services/http.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private apiUrl = environment.backendUrl + '/reservations';
  private http = inject(HttpService);

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('Client error:', error.error.message);
    } else {
      // Server-side error
      console.error(`Server error: ${error.status} - ${error.message}`);
      console.error('Error body:', error.error);
    }
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  createReservation(request: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, request).pipe(catchError(this.handleError));
  }

  getReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getReservation(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  updateReservation(id: string, request: Partial<Reservation>): Observable<Partial<Reservation>> {
    return this.http
      .patch<Partial<Reservation>>(`${this.apiUrl}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  cancelReservation(id: string): Observable<Reservation> {
    return this.http.delete<Reservation>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  getReservationByToken(reservationId: string): Observable<Reservation> {
    return this.http
      .get<Reservation>(`${this.apiUrl}/share/${reservationId}`, { skipAuth: true })
      .pipe(catchError(this.handleError));
  }

  confirmParticipation(reservationId: string, email: string): Observable<Reservation> {
    return this.http
      .post<Reservation>(`${this.apiUrl}/share/${reservationId}/confirm`, { email }, { skipAuth: true })
      .pipe(catchError(this.handleError));
  }

  updateParticipantConfirmation(
    reservationId: string,
    email: string,
    confirmed: boolean,
  ): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(`${this.apiUrl}/${reservationId}/participant/confirm`, {
        email,
        confirmed,
      })
      .pipe(catchError(this.handleError));
  }

  // Note: Token generation methods removed - using direct reservation IDs for share links

  getAvailableTimeSlots(date: string): Observable<TimeSlot[]> {
    return this.http
      .get<TimeSlot[]>(`${this.apiUrl}/availability/slots?date=${date}`)
      .pipe(catchError(this.handleError));
  }

  getAvailableDates(startDate?: string): Observable<string[]> {
    let url = `${this.apiUrl}/availability/dates`;
    if (startDate) {
      url += `?startDate=${startDate}`;
    }
    return this.http.get<string[]>(url).pipe(catchError(this.handleError));
  }

  checkSlotAvailability(date: string, time: string): Observable<{ available: boolean }> {
    return this.http
      .get<{ available: boolean }>(`${this.apiUrl}/availability/check?date=${date}&time=${time}`)
      .pipe(catchError(this.handleError));
  }
}
