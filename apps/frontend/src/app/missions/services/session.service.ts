import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MissionSession,
  SessionPlayer,
  GameResult,
  PlayerGameResult,
  UserProfile,
} from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly apiUrl = environment.backendUrl;
  private http: HttpService = inject(HttpService);

  createSession(missionSlug: string, gameMasterUsername: string): Observable<MissionSession> {
    return this.http.post<MissionSession>(`${this.apiUrl}/sessions`, {
      missionSlug: missionSlug,
      gameMaster: gameMasterUsername,
    });
  }

  getSessions(): Observable<MissionSession[]> {
    return this.http.get<MissionSession[]>(`${this.apiUrl}/sessions`);
  }

  getSession(sessionId: string): Observable<MissionSession> {
    return this.http.get<MissionSession>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  getSessionPlayers(sessionId: string): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.apiUrl}/sessions/${sessionId}/players`);
  }

  addSessionPlayers(sessionId: string, playerIds: string[]): Observable<SessionPlayer[]> {
    return this.http.post<SessionPlayer[]>(`${this.apiUrl}/sessions/${sessionId}/players`, {
      player_ids: playerIds,
    });
  }

  removeSessionPlayers(sessionId: string, playerIds: string[]): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${sessionId}/players`, {
      body: { player_ids: playerIds },
    } as any);
  }

  startSession(sessionId: string): Observable<MissionSession> {
    // Backend uses @Patch and gets sessionId from URL param
    // Empty body - backend sets start_time automatically
    return this.http.patch<MissionSession>(`${this.apiUrl}/sessions/${sessionId}/start`, {} as any);
  }

  endSession(sessionId: string): Observable<MissionSession> {
    // Backend uses @Patch and gets sessionId from URL param
    // Empty body - backend sets end_time automatically
    return this.http.patch<MissionSession>(`${this.apiUrl}/sessions/${sessionId}/end`, {} as any);
  }

  getGameResults(sessionId: string): Observable<PlayerGameResult[]> {
    return this.http.get<PlayerGameResult[]>(`${this.apiUrl}/sessions/${sessionId}/game-results`);
  }

  createGameResults(
    sessionId: string,
    gameSlug: string,
    players: UserProfile[],
  ): Observable<GameResult[]> {
    // Backend expects usernames, not IDs
    const playerNames = players.map((player) => player.username);

    const requestBody = {
      gameSlug: gameSlug,
      playerNames: playerNames,
    };

    return this.http.post<GameResult[]>(
      `${this.apiUrl}/sessions/${sessionId}/game-results`,
      requestBody,
    );
  }
}
