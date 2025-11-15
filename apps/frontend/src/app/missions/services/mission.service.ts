import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Mission } from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class MissionService {
  private readonly apiUrl = environment.backendUrl;

  private http: HttpService = inject(HttpService);

  getMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/missions`);
  }

  getMissionBySlug(slug: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/missions/${slug}`);
  }

  getMission(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/missions/${id}`);
  }

  playMission(missionSlug: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sessions/play-mission`, {
      missionSlug,
    });
  }

  getMissionPlayingStatus(missionSlug: string): Observable<{ isPlaying: boolean; activeSessions: number }> {
    return this.http.get<{ isPlaying: boolean; activeSessions: number }>(
      `${this.apiUrl}/sessions/mission/${missionSlug}/status`,
    );
  }

  getMissionPlayers(slug: string): Observable<MissionPlayer[]> {
    return this.http.get<MissionPlayer[]>(`${this.apiUrl}/missions/${slug}/players`);
  }

  updatePlayerScore(slug: string, playerId: string, score: number | null): Observable<MissionPlayer> {
    return this.http.patch<MissionPlayer>(
      `${this.apiUrl}/missions/${slug}/players/${playerId}/score`,
      { score } as unknown as MissionPlayer,
    );
  }
}

export interface MissionPlayer {
  player_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  score: number | null;
  mental_fortitude_composure_score?: number | null;
  adaptability_decision_making_score?: number | null;
  aim_mechanical_skill_score?: number | null;
  game_sense_awareness_score?: number | null;
  teamwork_communication_score?: number | null;
  strategy_score?: number | null;
  state?: 'playing' | 'completed';
  created_at: string;
  updated_at: string;
}
