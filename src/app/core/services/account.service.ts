import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface RegenerateApiKeyResponse {
  token: string;
  apiKey: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = environment.apiUrl;
  private readonly API_KEY_STORAGE = 'api_key';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getApiKey(): string {
    return localStorage.getItem(this.API_KEY_STORAGE) ?? '';
  }

  saveApiKey(key: string): void {
    localStorage.setItem(this.API_KEY_STORAGE, key);
  }

  regenerateApiKey(): Observable<RegenerateApiKeyResponse> {
    return this.http.post<RegenerateApiKeyResponse>(
      `${this.api}/api/account/regenerateapikey`, {}
    ).pipe(
      tap(res => {
        if (res.token)  this.authService.saveToken(res.token);
        if (res.apiKey) this.saveApiKey(res.apiKey);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.api}/api/account/changepassword`, {
      currentPassword,
      newPassword
    });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.api}/api/account/deleteaccount`);
  }
}