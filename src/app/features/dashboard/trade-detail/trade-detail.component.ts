import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { createChart, ColorType, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { TradeService } from '../../../core/services/trade.service';
import { ToastService } from '../../../core/services/toast.service';
import { Trade, TradeStatus, Candle } from '../../../core/models/trade.model';

@Component({
  selector: 'app-trade-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './trade-detail.component.html',
  styleUrl: './trade-detail.component.scss'
})
export class TradeDetailComponent implements OnInit, OnDestroy {
  private _chartContainer?: ElementRef;

  @ViewChild('chartContainer') set chartContainer(el: ElementRef | undefined) {
    this._chartContainer = el;
    if (el && this.trade && !this.chart) {
      this.initChart();
    }
  }

  trade: Trade | null = null;
  loading = true;
  error: string | null = null;
  activeMainTab = signal<'ohlc' | 'screenshots'>('ohlc');
  readonly TradeStatus = TradeStatus;

  // Screenshot editing
  screenshotBefore = '';
  screenshotAfter = '';
  savingScreenshots = false;
  screenshotsSaved = false;

  // Trade detail editing
  editExitPrice: number | null = null;
  editExitTime = '';
  editingExitTime = false;
  editStopLoss: number | null = null;
  editTakeProfit: number | null = null;
  savingDetails = false;
  detailsSaved = false;

  private sub?: Subscription;
  private chart?: ReturnType<typeof createChart>;

  constructor(
    private route: ActivatedRoute,
    private tradeService: TradeService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sub = this.tradeService.getTradeById(id).subscribe({
      next: trade => {
        this.trade = trade;
        this.screenshotBefore = trade.chartData?.screenshotUrlBefore ?? '';
        this.screenshotAfter  = trade.chartData?.screenshotUrlAfter  ?? '';
        this.editExitPrice  = trade.exitPrice  ?? null;
        this.editStopLoss   = trade.stopLoss   ?? null;
        this.editTakeProfit = trade.takeProfit ?? null;
        this.editExitTime   = trade.exitTime   ? this.toDatetimeLocal(trade.exitTime) : '';
        this.loading = false;
        this.cdr.detectChanges();
        // ViewChild setter handles initChart when the element appears
      },
      error: () => {
        this.error = 'TRADE_DETAIL.ERROR';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.chart?.remove();
  }

  switchMainTab(tab: 'ohlc' | 'screenshots'): void {
    if (this.activeMainTab() === tab) return;
    this.chart?.remove();
    this.chart = undefined;
    this.activeMainTab.set(tab);
    // ViewChild setter will call initChart() when #chartContainer appears
  }

  get hasOhlcData(): boolean {
    return (this.trade?.chartData?.ohlcDataBefore?.candles?.length ?? 0) > 0 ||
           (this.trade?.chartData?.ohlcDataAfter?.candles?.length ?? 0) > 0;
  }

  get chartTimeframe(): string {
    return this.trade?.chartData?.ohlcDataBefore?.timeframe
      ?? this.trade?.chartData?.ohlcDataAfter?.timeframe
      ?? '';
  }

  private mergedCandles(): Candle[] {
    const before = this.trade?.chartData?.ohlcDataBefore?.candles ?? [];
    const after = this.trade?.chartData?.ohlcDataAfter?.candles ?? [];
    const map = new Map<number, Candle>();
    [...before, ...after].forEach(c => map.set(c.time, c));
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }

  private initChart(): void {
    if (!this._chartContainer || !this.trade) return;

    const candles = this.mergedCandles();
    if (!candles.length) return;

    const container = this._chartContainer.nativeElement as HTMLElement;

    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#9a9a9a',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: '#4f6ef7' },
        horzLine: { labelBackgroundColor: '#4f6ef7' },
      },
      rightPriceScale: { borderColor: '#333333' },
      timeScale: { borderColor: '#333333', timeVisible: true, secondsVisible: false },
      height: 380,
    });

    const series = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    series.setData(candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));

    if (this.trade.entryPrice != null) {
      series.createPriceLine({
        price: this.trade.entryPrice,
        color: '#4f6ef7',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `ENTRY: ${this.trade.entryPrice}`,
      });
    }
    if (this.trade.exitPrice != null) {
      series.createPriceLine({
        price: this.trade.exitPrice,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `EXIT: ${this.trade.exitPrice}`,
      });
    }
    if (this.trade.stopLoss != null) {
      series.createPriceLine({
        price: this.trade.stopLoss,
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL: ${this.trade.stopLoss}`,
      });
    }
    if (this.trade.takeProfit != null) {
      series.createPriceLine({
        price: this.trade.takeProfit,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP: ${this.trade.takeProfit}`,
      });
    }

    this.chart.timeScale().fitContent();
  }

  saveScreenshots(): void {
    if (!this.trade || this.savingScreenshots) return;

    const before = this.screenshotBefore.trim() || null;
    const after = this.screenshotAfter.trim() || null;

    this.savingScreenshots = true;
    this.screenshotsSaved = false;
    this.tradeService.updateScreenshot(this.trade.id, before, after).subscribe({
      next: () => {
        this.trade = {
          ...this.trade!,
          chartData: {
            ...this.trade!.chartData,
            screenshotUrlBefore: before,
            screenshotUrlAfter: after,
          }
        };
        this.screenshotBefore = before ?? '';
        this.screenshotAfter = after ?? '';
        this.savingScreenshots = false;
        this.screenshotsSaved = true;
        this.toastService.show('TRADE_DETAIL.SCREENSHOTS.SAVE_SUCCESS', 'success');
        setTimeout(() => { this.screenshotsSaved = false; }, 3000);
      },
      error: () => {
        this.savingScreenshots = false;
        this.toastService.show('TRADE_DETAIL.SCREENSHOTS.SAVE_ERROR', 'error');
      }
    });
  }

  saveTradeDetails(): void {
    if (!this.trade || this.savingDetails) return;

    const updated: Trade = {
      ...this.trade,
      exitPrice:   this.editExitPrice,
      stopLoss:    this.editStopLoss,
      takeProfit:  this.editTakeProfit,
      exitTime:    this.editExitTime || null,
    };

    this.savingDetails = true;
    this.detailsSaved = false;
    this.tradeService.updateTrade(updated).subscribe({
      next: () => {
        this.trade = updated;
        this.savingDetails = false;
        this.detailsSaved = true;
        this.toastService.show('TRADE_DETAIL.EDIT.SAVE_SUCCESS', 'success');
        setTimeout(() => { this.detailsSaved = false; }, 3000);
      },
      error: () => {
        this.savingDetails = false;
        this.toastService.show('TRADE_DETAIL.EDIT.SAVE_ERROR', 'error');
      }
    });
  }

  startEditExitTime(): void {
    this.editingExitTime = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('.exit-time-input');
      el?.focus();
    }, 0);
  }

  private toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  get directionLabel(): string {
    return this.trade?.direction?.toLowerCase() === 'buy' ? 'LONG' : 'SHORT';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatPnl(value: number): string {
    return (value >= 0 ? '+' : '') + '$' + Math.abs(value).toFixed(2);
  }

  formatPips(pips: number | null | undefined): string {
    if (pips == null) return '—';
    return (pips >= 0 ? '+' : '') + pips.toFixed(5);
  }
}
