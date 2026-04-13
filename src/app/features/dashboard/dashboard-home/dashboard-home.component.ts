import { Component, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardStateService } from '../../../core/services/dashboard-state.service';
import { TradeService } from '../../../core/services/trade.service';
import { Trade, TradeStatus } from '../../../core/models/trade.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent {
  currentPage = 0;
  readonly PAGE_SIZE = 10;
  readonly TradeStatus = TradeStatus;

  // Filters — signals so computed() can track them
  readonly filterSymbol    = signal('');
  readonly filterDirection = signal('');
  readonly filterStatus    = signal('');

  // Derived state — recomputes only when state.trades() or a filter signal changes
  readonly filteredTrades = computed(() => {
    const sym = this.filterSymbol().trim().toLowerCase();
    const dir = this.filterDirection();
    const stat = this.filterStatus();
    return [...this.state.trades()]
      .filter(t => !sym || t.symbol?.toLowerCase().includes(sym))
      .filter(t => !dir || t.direction === dir)
      .filter(t => !stat || t.status === stat)
      .sort((a, b) => {
        const aOpen = a.status === TradeStatus.Open ? 0 : 1;
        const bOpen = b.status === TradeStatus.Open ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime();
      });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTrades().length / this.PAGE_SIZE))
  );

  readonly isFiltered = computed(() =>
    !!this.filterSymbol().trim() || !!this.filterDirection() || !!this.filterStatus()
  );

  // Popover
  popoverTrade: Trade | null = null;
  popoverX = 0;
  popoverY = 0;

  // Screenshot modal
  modalTrade: Trade | null = null;
  modalLoading = false;
  screenshotBefore = '';
  screenshotAfter = '';
  saving = false;

  // Delete
  deleting = false;

  // Add Trade modal
  addTradeOpen = false;
  addTradeSaving = false;
  addTradeForm: Trade = this.emptyForm();

  constructor(
    public state: DashboardStateService,
    private tradeService: TradeService,
    private router: Router
  ) {}

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

  get paginatedTrades(): Trade[] {
    const start = this.currentPage * this.PAGE_SIZE;
    return this.filteredTrades().slice(start, start + this.PAGE_SIZE);
  }

  setFilterSymbol(v: string):    void { this.filterSymbol.set(v);    this.currentPage = 0; }
  setFilterDirection(v: string): void { this.filterDirection.set(v); this.currentPage = 0; }
  setFilterStatus(v: string):    void { this.filterStatus.set(v);    this.currentPage = 0; }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages() - 1) this.currentPage++; }

  // ── Popover ───────────────────────────────────────────────────────────────────

  onRowClick(event: MouseEvent, trade: Trade): void {
    event.stopPropagation();

    if (this.popoverTrade?.id === trade.id) {
      this.popoverTrade = null;
      return;
    }

    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    this.popoverX = event.clientX;
    this.popoverY = rect.bottom + window.scrollY + 4;
    this.popoverTrade = trade;
  }

  @HostListener('document:click')
  closePopover(): void {
    this.popoverTrade = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.popoverTrade = null;
    this.closeModal();
  }

  openDetails(): void {
    if (!this.popoverTrade) return;
    this.router.navigate(['/dashboard/trade', this.popoverTrade.id]);
    this.popoverTrade = null;
  }

  deleteTrade(): void {
    if (!this.popoverTrade || this.deleting) return;
    const trade = this.popoverTrade;
    this.popoverTrade = null;

    const label = trade.externalId != null ? `${trade.symbol} #${trade.externalId}` : trade.symbol;
    if (!confirm(`Delete trade ${label}?`)) return;

    this.deleting = true;
    this.tradeService.deleteTrade(trade.id).subscribe({
      next: () => {
        this.state.removeTrade(trade.id);
        this.deleting = false;
      },
      error: () => { this.deleting = false; }
    });
  }

  openScreenshotModal(): void {
    if (!this.popoverTrade) return;
    this.modalTrade = this.popoverTrade;
    this.screenshotBefore = this.modalTrade.chartData?.screenshotUrlBefore ?? '';
    this.screenshotAfter  = this.modalTrade.chartData?.screenshotUrlAfter  ?? '';
    this.modalLoading = false;
    this.popoverTrade = null;
  }

  // ── Screenshot Modal ──────────────────────────────────────────────────────────

  closeModal(): void {
    this.modalTrade = null;
    this.modalLoading = false;
    this.screenshotBefore = '';
    this.screenshotAfter = '';
    this.saving = false;
  }

  saveScreenshots(): void {
    if (!this.modalTrade || this.saving) return;

    const before = this.screenshotBefore.trim() || null;
    const after = this.screenshotAfter.trim() || null;

    this.saving = true;
    this.tradeService.updateScreenshot(this.modalTrade.id, before, after).subscribe({
      next: () => {
        this.state.patchTrade({
          ...this.modalTrade!,
          chartData: { ...this.modalTrade!.chartData, screenshotUrlBefore: before, screenshotUrlAfter: after }
        });
        this.saving = false;
        this.closeModal();
      },
      error: () => { this.saving = false; }
    });
  }

  // ── Add Trade Modal ───────────────────────────────────────────────────────────

  private emptyForm(): Trade {
    return {
      id: null as any,
      externalId: null,
      symbol: null as any,
      direction: null as any,
      entryPrice: null,
      exitPrice: null,
      stopLoss: null,
      takeProfit: null,
      lotSize: null,
      profit: null,
      profitPips: null,
      mae: null,
      mfe: null,
      efficiency: null,
      entryTime: null as any,
      exitTime: null,
      durationMinutes: null,
      chartData: { screenshotUrlBefore: null, screenshotUrlAfter: null },
      status: null as any,
      updatedAt: null as any,
      createdAt: null as any
    };
  }

  openAddTradeModal(): void {
    this.addTradeForm = this.emptyForm();
    this.addTradeOpen = true;
  }

  closeAddTradeModal(): void {
    this.addTradeOpen = false;
    this.addTradeSaving = false;
  }

  submitTrade(): void {
    if (!this.addTradeForm.symbol || !this.addTradeForm.entryTime || this.addTradeSaving) return;

    const trade = this.addTradeForm;
    this.addTradeSaving = true;
    this.tradeService.openTrade(trade).subscribe({
      next: () => {
        this.closeAddTradeModal();
        this.state.refresh();
      },
      error: () => { this.addTradeSaving = false; }
    });
  }

  // ── Formatters ────────────────────────────────────────────────────────────────

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
