import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Session, PlayerGameResult, UserProfile } from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly apiUrl = environment.backendUrl;
  private http: HttpService = inject(HttpService);

  createSession(missionSlug: string, gameMasterUsername: string): Observable<Session> {
    return this.http.post<Session>(`${this.apiUrl}/sessions`, {
      missionSlug: missionSlug,
      gameMaster: gameMasterUsername,
    });
  }

  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/sessions`);
  }

  getSession(sessionId: string): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  getSessionPlayers(sessionId: string): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.apiUrl}/sessions/${sessionId}/players`);
  }

  addSessionPlayers(sessionId: string, playerNames: string[]): Observable<PlayerGameResult[]> {
    return this.http.post<PlayerGameResult[]>(`${this.apiUrl}/sessions/${sessionId}/players`, {
      playerNames: playerNames,
    });
  }

  startSession(sessionId: string): Observable<Session> {
    // Backend uses @Patch and gets sessionId from URL param
    // Empty body - backend sets start_time automatically
    return this.http.patch<Session>(`${this.apiUrl}/sessions/${sessionId}/start`, {} as any);
  }

  endSession(sessionId: string): Observable<Session> {
    // Backend uses @Patch and gets sessionId from URL param
    // Empty body - backend sets end_time automatically
    return this.http.patch<Session>(`${this.apiUrl}/sessions/${sessionId}/end`, {} as any);
  }

  getGameResults(sessionId: string): Observable<PlayerGameResult[]> {
    return this.http.get<PlayerGameResult[]>(`${this.apiUrl}/sessions/${sessionId}/game-results`);
  }
}
