import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ScratchCard } from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class ScratchCardService {
  private readonly apiUrl = environment.backendUrl;
  private http: HttpService = inject(HttpService);

  getScratchCard(): Observable<ScratchCard> {
    return this.http.get<ScratchCard>(`${this.apiUrl}/scratch-card`);
  }
}
