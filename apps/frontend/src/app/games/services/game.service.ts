import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../shared/services/http.service';
import { Observable } from 'rxjs';
import { Game } from '@gamebox/shared';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly apiUrl = environment.backendUrl;

  private http: HttpService = inject(HttpService);

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.apiUrl}/games`);
  }

  getGameBySlug(slug: string): Observable<Game> {
    return this.http.get<Game>(`${this.apiUrl}/games/${slug}`);
  }
}
