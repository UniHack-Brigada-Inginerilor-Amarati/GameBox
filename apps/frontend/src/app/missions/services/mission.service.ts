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
}
