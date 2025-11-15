import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfileDTO, GameScore, AbilityScores } from '@gamebox/shared';
import { HttpService } from '../../shared/services/http.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private httpService = inject(HttpService);
  private backendUrl = environment.backendUrl;

  getProfile(): Observable<UserProfileDTO> {
    return this.httpService.get<UserProfileDTO>(`${this.backendUrl}/profiles/me`);
  }

  updateProfile(updates: Partial<UserProfileDTO>): Observable<Partial<UserProfileDTO>> {
    return this.httpService.patch<Partial<UserProfileDTO>>(
      `${this.backendUrl}/profiles/me`,
      updates,
    );
  }

  generateAvatar(): Observable<{ avatar_url: string }> {
    return this.httpService.get<{ avatar_url: string }>(`${this.backendUrl}/profiles/me/avatar`);
  }

  uploadAvatar(file: File): Observable<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.httpService.post<{ avatar_url: string }>(
      `${this.backendUrl}/profiles/me/avatar`,
      formData,
    );
  }

  getLeagueScore(region?: string): Observable<GameScore> {
    const url = region
      ? `${this.backendUrl}/profiles/me/league-score?region=${region}`
      : `${this.backendUrl}/profiles/me/league-score`;
    return this.httpService.get<GameScore>(url);
  }

  getAbilityScores(): Observable<AbilityScores> {
    return this.httpService.get<AbilityScores>(`${this.backendUrl}/profiles/me/abilities`);
  }

  recalculateSpyCard(username: string): Observable<{
    success: boolean;
    totalScore: number;
    overallRank: number;
    missionCount: number;
    message: string;
  }> {
    return this.httpService.post<{
      success: boolean;
      totalScore: number;
      overallRank: number;
      missionCount: number;
      message: string;
    }>(`${this.backendUrl}/profiles/${username}/spy-card/recalculate`, {});
  }
}
