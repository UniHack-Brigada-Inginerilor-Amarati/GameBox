import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Tournament, TournamentRegistration } from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private readonly apiUrl = environment.backendUrl;

  private http: HttpService = inject(HttpService);

  getTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.apiUrl}/tournaments`);
  }

  getTournamentBySlug(slug: string): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.apiUrl}/tournaments/${slug}`);
  }

  getTournamentById(id: number): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.apiUrl}/tournaments/id/${id}`);
  }

  joinTournament(tournamentId: number): Observable<TournamentRegistration> {
    return this.http.post<TournamentRegistration>(
      `${this.apiUrl}/tournaments/${tournamentId}/join`,
      {},
    );
  }

  leaveTournament(tournamentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tournaments/${tournamentId}/leave`);
  }
}

