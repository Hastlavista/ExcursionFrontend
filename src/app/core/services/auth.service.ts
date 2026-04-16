import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  token: string;
  apiKey?: string;
  isPro?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly IS_PRO_KEY = 'is_pro';
  private readonly api = environment.apiUrl;

  isAuthenticated = signal<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(payload: LoginPayload) {
    return this.http.post<AuthUser>(`${this.api}/api/public/auth/login`, payload).pipe(
      tap(user => {
        localStorage.setItem(this.TOKEN_KEY, user.token);
        if (user.apiKey) localStorage.setItem('api_key', user.apiKey);
        localStorage.setItem(this.IS_PRO_KEY, String(user.isPro ?? false));
        this.isAuthenticated.set(true);
        this.router.navigate(['/dashboard']);
      })
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<AuthUser>(`${this.api}/api/public/auth/register`, payload).pipe(
      tap(() => {
        this.router.navigate(['/auth/login']);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('api_key');
    localStorage.removeItem(this.IS_PRO_KEY);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  getIsPro(): boolean {
    return localStorage.getItem(this.IS_PRO_KEY) === 'true';
  }

  setIsPro(value: boolean): void {
    localStorage.setItem(this.IS_PRO_KEY, String(value));
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserEmail(): string {
    const token = this.getToken();
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email ?? payload.sub ?? '';
    } catch {
      return '';
    }
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }
}
