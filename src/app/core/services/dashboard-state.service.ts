import { Injectable, signal, computed } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TradeService } from './trade.service';
import { Trade, TradeStatus } from '../models/trade.model';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private readonly _trades = signal<Trade[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _tradeLimitReached = signal(false);
  private pollSub?: Subscription;

  readonly trades = this._trades.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly tradeLimitReached = this._tradeLimitReached.asReadonly();

  setTradeLimitReached(value: boolean): void {
    this._tradeLimitReached.set(value);
  }

  readonly openPositions = computed(() =>
    this._trades().filter(t => t.status === TradeStatus.Open).length
  );

  readonly todayPnl = computed(() => {
    const today = new Date().toDateString();
    return this._trades()
      .filter(t => t.status === TradeStatus.Closed && t.exitTime && new Date(t.exitTime).toDateString() === today)
      .reduce((sum, t) => sum + (t.profit ?? 0), 0);
  });

  constructor(private tradeService: TradeService) {}

  startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = timer(0, 30000).pipe(
      switchMap(() => this.tradeService.getTrades())
    ).subscribe({
      next: trades => {
        this._trades.set(trades ?? []);
        this._loading.set(false);
        this._error.set(null);
      },
      error: () => {
        this._error.set('DASHBOARD.ERROR');
        this._loading.set(false);
      }
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
    this._loading.set(true);
  }

  patchTrade(updated: Trade): void {
    this._trades.update(list => list.map(t => t.id === updated.id ? updated : t));
  }

  removeTrade(id: string): void {
    this._trades.update(list => list.filter(t => t.id !== id));
  }

  refresh(): void {
    this.tradeService.getTrades().subscribe({
      next: trades => this._trades.set(trades ?? []),
      error: () => {}
    });
  }
}