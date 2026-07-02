// ============================================================
// Agent 1 — Login Component (TypeScript)
// Glassmorphism card + GSAP stagger entry animation
// ============================================================
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { gsap } from 'gsap';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  @ViewChild('card', { static: true }) cardRef!: ElementRef;
  @ViewChild('logoRef', { static: true }) logoRef!: ElementRef;

  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  private returnUrl = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    this.runEntryAnimation();
  }

  private runEntryAnimation(): void {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      '.login-bg-orb',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.4, stagger: 0.2 }
    )
      .fromTo(
        this.cardRef.nativeElement,
        { y: 60, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8 },
        '-=0.6'
      )
      .fromTo(
        this.logoRef.nativeElement,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.4'
      )
      .fromTo(
        '.form-field',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.12 },
        '-=0.3'
      )
      .fromTo(
        '.btn-login',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4 },
        '-=0.1'
      );
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    gsap.to(this.cardRef.nativeElement, { scale: 0.99, duration: 0.15, yoyo: true, repeat: 1 });

    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.toast.success(`مرحباً، ${res.data.admin.name} 👑`);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: () => {
        this.isLoading = false;
        gsap.fromTo(
          this.cardRef.nativeElement,
          { x: -8 },
          { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
        );
      },
    });
  }

  get emailCtrl()   { return this.loginForm.get('email')!; }
  get passCtrl()    { return this.loginForm.get('password')!; }
  get currentYear() { return new Date().getFullYear(); }
}
