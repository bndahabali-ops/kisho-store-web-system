// order-analytics.component.ts
// ── KISHO Admin — Analytics & Financial Insights Component ──────────────────
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  AnalyticsService,
  AnalyticsSummary,
  OrderMetrics,
} from '../../../core/services/analytics.service';

interface StatusRow {
  key:   keyof Pick<OrderMetrics,
    'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'>;
  label: string;
  icon:  string;
  color: string;
  glow:  string;
}

@Component({
  selector: 'app-order-analytics',
  templateUrl: './order-analytics.component.html',
  styleUrls: ['./order-analytics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderAnalyticsComponent implements OnInit, OnDestroy {

  summary: AnalyticsSummary | null = null;
  loading = true;
  error: string | null = null;

  private readonly destroy$ = new Subject<void>();

  /** Skeleton placeholder rows for the pipeline list */
  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7];

  /** Status rows drive the progress-bar pipeline in the right panel */
  readonly statusRows: StatusRow[] = [
    { key: 'pending',    label: 'Pending',    icon: '⏳', color: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
    { key: 'confirmed',  label: 'Confirmed',  icon: '✅', color: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
    { key: 'processing', label: 'Processing', icon: '⚙️', color: '#8b5cf6', glow: 'rgba(139,92,246,0.25)' },
    { key: 'shipped',    label: 'Shipped',    icon: '🚚', color: '#06b6d4', glow: 'rgba(6,182,212,0.25)'  },
    { key: 'delivered',  label: 'Delivered',  icon: '📦', color: '#10b981', glow: 'rgba(16,185,129,0.25)' },
    { key: 'cancelled',  label: 'Cancelled',  icon: '❌', color: '#ef4444', glow: 'rgba(239,68,68,0.25)'  },
    { key: 'refunded',   label: 'Refunded',   icon: '↩️', color: '#6b7280', glow: 'rgba(107,114,128,0.2)' },
  ];

  constructor(
    private readonly analyticsSvc: AnalyticsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Manually refresh data */
  refresh(): void {
    this.load();
  }

  /** Returns the count for a given status key — falls back to 0 safely */
  getCount(key: StatusRow['key']): number {
    return this.summary?.metrics[key] ?? 0;
  }

  /**
   * Returns the percentage a status represents out of ALL orders (0–100).
   * Used to drive progress-bar widths.
   */
  getPercent(key: StatusRow['key']): number {
    const total = this.summary?.metrics.total ?? 0;
    if (total === 0) return 0;
    return Math.round((this.getCount(key) / total) * 100);
  }

  /** Format a number as compact EGP currency string */
  formatCurrency(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('en-EG');
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private load(): void {
    this.loading = true;
    this.error   = null;
    this.cdr.markForCheck();

    this.analyticsSvc.getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.summary = res.data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.error   = this.formatError(err);
          this.cdr.markForCheck();
        },
      });
  }

  private formatError(err: any): string {
    const status: number = err?.status;
    if (status === 0)   return 'Cannot reach the server — make sure the backend is running.';
    if (status === 401) return 'Session expired — please log in again.';
    if (status === 403) return 'Access denied — admin privileges required.';
    if (status === 500) return 'Internal server error — please try again later.';
    return err?.error?.message ?? 'Failed to load analytics data.';
  }
}
