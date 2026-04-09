import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardStateService } from '../../../core/services/dashboard-state.service';
import { Trade, TradeStatus } from '../../../core/models/trade.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent {
  currentPage = 0;
  readonly PAGE_SIZE = 10;
  readonly TradeStatus = TradeStatus;

  constructor(public state: DashboardStateService, private router: Router) {}

  get trades(): Trade[] { return this.state.trades(); }
  get loading(): boolean { return this.state.loading(); }
  get error(): string | null { return this.state.error(); }

  get closedTrades(): Trade[] {
    return this.trades.filter(t => t.status === TradeStatus.Closed);
  }

  get winRate(): number {
    if (!this.closedTrades.length) return 0;
    return (this.closedTrades.filter(t => (t.profit ?? 0) > 0).length / this.closedTrades.length) * 100;
  }

  get profitFactor(): number {
    const gains = this.closedTrades.filter(t => (t.profit ?? 0) > 0).reduce((s, t) => s + (t.profit ?? 0), 0);
    const losses = Math.abs(this.closedTrades.filter(t => (t.profit ?? 0) < 0).reduce((s, t) => s + (t.profit ?? 0), 0));
    if (losses === 0) return gains > 0 ? 99.99 : 0;
    return gains / losses;
  }

  get totalProfit(): number {
    return this.closedTrades.reduce((s, t) => s + (t.profit ?? 0), 0);
  }

  get avgRR(): number {
    const wins = this.closedTrades.filter(t => (t.profit ?? 0) > 0);
    const losses = this.closedTrades.filter(t => (t.profit ?? 0) < 0);
    if (!wins.length || !losses.length) return 0;
    const avgWin = wins.reduce((s, t) => s + (t.profit ?? 0), 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + (t.profit ?? 0), 0) / losses.length);
    return avgWin / avgLoss;
  }

  get sortedTrades(): Trade[] {
    return [...this.trades].sort(
      (a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    );
  }

  get paginatedTrades(): Trade[] {
    const start = this.currentPage * this.PAGE_SIZE;
    return this.sortedTrades.slice(start, start + this.PAGE_SIZE);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.trades.length / this.PAGE_SIZE));
  }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }

  openTrade(trade: Trade): void {
    this.router.navigate(['/dashboard/trade', trade.id]);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  formatPnl(value: number): string {
    return (value >= 0 ? '+' : '') + '$' + Math.abs(value).toFixed(2);
  }

  formatPips(pips: number | null | undefined): string {
    if (pips == null) return '—';
    return (pips >= 0 ? '+' : '') + pips.toFixed(1);
  }
}