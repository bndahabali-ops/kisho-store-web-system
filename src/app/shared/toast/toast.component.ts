import { Component, OnInit } from '@angular/core';
import { Toast, ToastService } from '../../core/services/toast.service';

import { gsap } from 'gsap';

@Component({
  selector: 'app-toast',
  template: `
<div class="toast-container">
  <div
    class="toast-item"
    *ngFor="let t of toasts; trackBy: trackById"
    [ngClass]="'toast-' + t.type"
    (click)="toastSvc.remove(t.id)"
  >
    <span class="toast-icon">
      <svg *ngIf="t.type==='success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <svg *ngIf="t.type==='error'"   width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <svg *ngIf="t.type==='warning'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <svg *ngIf="t.type==='info'"    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    </span>
    <span class="toast-msg">{{ t.message }}</span>
    <span class="toast-progress" [style.animation-duration]="t.duration + 'ms'"></span>
  </div>
</div>
  `,
  styles: [`
    .toast-container {
      position: fixed; bottom: 28px; left: 28px;
      z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
      pointer-events: none;
      font-family: 'Cairo', sans-serif;
    }
    .toast-item {
      pointer-events: all;
      display: flex; align-items: center; gap: 12px;
      padding: 14px 18px;
      border-radius: 14px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid;
      min-width: 280px; max-width: 380px;
      cursor: pointer;
      position: relative; overflow: hidden;
      animation: toastIn 0.4s cubic-bezier(.16,1,.3,1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    @keyframes toastIn { from { opacity:0; transform: translateY(20px) scale(0.95); } to { opacity:1; transform: none; } }
    .toast-success { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #6ee7b7; }
    .toast-error   { background: rgba(239,68,68,0.12);  border-color: rgba(239,68,68,0.3);  color: #fca5a5; }
    .toast-warning { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #fcd34d; }
    .toast-info    { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); color: #93c5fd; }
    .toast-icon { flex-shrink: 0; }
    .toast-msg { font-size: 0.88rem; font-weight: 600; flex: 1; direction: rtl; }
    .toast-progress {
      position: absolute; bottom: 0; right: 0;
      height: 3px; width: 100%;
      background: currentColor; opacity: 0.4;
      border-radius: 0 0 14px 14px;
      animation: progress linear forwards;
      transform-origin: right;
    }
    @keyframes progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `],
})
export class ToastComponent implements OnInit {
  toasts: Toast[] = [];
  constructor(public toastSvc: ToastService) {}
  ngOnInit(): void { this.toastSvc.toasts$.subscribe(t => (this.toasts = t)); }
  trackById(_: number, t: Toast): string { return t.id; }
}
