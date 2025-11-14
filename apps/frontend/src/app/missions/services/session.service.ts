import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MissionSession,
  SessionPlayer,
  GameResult,
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

  createSession(
    missionSlug: string,
    gameMasterId: string
  ): Observable<MissionSession> {
    return this.http.post<MissionSession>(`${this.apiUrl}/sessions`, {
      mission_slug: missionSlug,
      game_master_id: gameMasterId,
    });
  }

  getSessions(): Observable<MissionSession[]> {
    return this.http.get<MissionSession[]>(`${this.apiUrl}/sessions`);
  }

  getSession(sessionId: string): Observable<MissionSession> {
    return this.http.get<MissionSession>(
      `${this.apiUrl}/sessions/${sessionId}`
    );
  }

  getSessionPlayers(sessionId: string): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(
      `${this.apiUrl}/sessions/${sessionId}/players`
    );
  }

  addSessionPlayers(
    sessionId: string,
    playerIds: string[]
  ): Observable<SessionPlayer[]> {
    return this.http.put<SessionPlayer[]>(
      `${this.apiUrl}/sessions/${sessionId}/players`,
      {
        player_ids: playerIds,
      } as any
    );
  }

  removeSessionPlayers(
    sessionId: string,
    playerIds: string[]
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/sessions/${sessionId}/players`,
      {
        body: { player_ids: playerIds },
      } as any
    );
  }

  startSession(sessionId: string): Observable<MissionSession> {
    return this.http.put<MissionSession>(
      `${this.apiUrl}/sessions/${sessionId}/start`,
      {
        time: Date.now(),
      } as any
    );
  }

  endSession(sessionId: string): Observable<MissionSession> {
    return this.http.put<MissionSession>(
      `${this.apiUrl}/sessions/${sessionId}/end`,
      {
        time: Date.now(),
      } as any
    );
  }

  getGameResults(sessionId: string): Observable<GameResult[]> {
    return this.http.get<GameResult[]>(
      `${this.apiUrl}/sessions/${sessionId}/game-results`
    );
  }

  createGameResults(
    sessionId: string,
    gameSlug: string,
    players: UserProfile[]
  ): Observable<GameResult[]> {
    const playerIds = players.map((player) => player.id);

    const requestBody = {
      game_slug: gameSlug,
      player_ids: playerIds,
    };

    return this.http.post<GameResult[]>(
      `${this.apiUrl}/sessions/${sessionId}/game-results`,
      requestBody
    );
  }
}
