// ============================================================
// Agent 3 — Auth Service
// POST /api/auth/login — JWT stored in localStorage
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoginPayload, LoginResponse, Admin } from '../models/auth.model';

const TOKEN_KEY = 'kisho_admin_token';
const ADMIN_KEY = 'kisho_admin_data';
const API = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminSubject = new BehaviorSubject<Admin | null>(this.loadAdmin());
  admin$ = this.adminSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  // ── Login ────────────────────────────────────────────────────────────────
  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/login`, payload).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);           // token is at ROOT
        localStorage.setItem(ADMIN_KEY, JSON.stringify(res.data.admin)); // admin inside data
        this.adminSubject.next(res.data.admin);
      })
    );
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    this.adminSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ── Token helpers ────────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private loadAdmin(): Admin | null {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
