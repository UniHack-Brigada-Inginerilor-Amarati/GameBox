import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '@gamebox/shared';
import { environment } from '../../../environments/environment';
import { HttpService } from '../../shared/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = environment.backendUrl;
  private http: HttpService = inject(HttpService);

  searchUsers(query: string): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(
      `${this.apiUrl}/profiles/search?q=${encodeURIComponent(query)}`
    );
  }
}
