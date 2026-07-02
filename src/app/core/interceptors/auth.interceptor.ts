// ============================================================
// Agent 2 — HTTP Interceptor
// • Attaches Bearer JWT to every outgoing request
// • Catches 401/403 → auto-logout + Arabic toast
// • Parses Arabic error messages from backend and forwards them
// ============================================================
import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private toast: ToastService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();

    // Clone request and attach Bearer token if available
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        const body = err.error;

        // ── Extract Arabic message from backend response ──────────────────
        let message: string = 'حدث خطأ غير متوقع';
        if (body) {
          if (typeof body.message === 'string') {
            message = body.message;
          }
          // Backend sends validation errors as array
          if (Array.isArray(body.errors) && body.errors.length) {
            message = body.errors.join(' | ');
          }
        }

        // ── 401: Unauthenticated → force logout ──────────────────────────
        if (err.status === 401) {
          this.toast.error('انتهت جلستك. الرجاء تسجيل الدخول مجدداً');
          this.auth.logout();
        }
        // ── 403: Forbidden ────────────────────────────────────────────────
        else if (err.status === 403) {
          this.toast.error('غير مصرح لك بهذه العملية');
        }
        // ── 404: Not found ────────────────────────────────────────────────
        else if (err.status === 404) {
          this.toast.error(message || 'العنصر غير موجود');
        }
        // ── 400: Validation errors ────────────────────────────────────────
        else if (err.status === 400) {
          this.toast.error(message);
        }
        // ── 500+: Server errors ───────────────────────────────────────────
        else if (err.status >= 500) {
          this.toast.error('خطأ في الخادم. الرجاء المحاولة لاحقاً');
        }

        return throwError(() => err);
      })
    );
  }
}
