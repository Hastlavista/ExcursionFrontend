import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { createChart, ColorType, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { TradeService } from '../../../core/services/trade.service';
import { Trade, TradeStatus } from '../../../core/models/trade.model';

@Component({
  selector: 'app-trade-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './trade-detail.component.html',
  styleUrl: './trade-detail.component.scss'
})
export class TradeDetailComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  trade: Trade | null = null;
  loading = true;
  error: string | null = null;
  activeTab = signal<'before' | 'after'>('before');
  readonly TradeStatus = TradeStatus;

  private sub?: Subscription;
  private chart?: ReturnType<typeof createChart>;

  constructor(
    private route: ActivatedRoute,
    private tradeService: TradeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sub = this.tradeService.getTradeById(id).subscribe({
      next: trade => {
        this.trade = trade;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initChart(), 0);
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

  switchTab(tab: 'before' | 'after'): void {
    if (this.activeTab() === tab) return;
    this.chart?.remove();
    this.chart = undefined;
    this.activeTab.set(tab);
    setTimeout(() => this.initChart(), 0);
  }

  get hasBefore(): boolean {
    return (this.trade?.chartData?.ohlcDataBefore?.candles?.length ?? 0) > 0;
  }

  get hasAfter(): boolean {
    return (this.trade?.chartData?.ohlcDataAfter?.candles?.length ?? 0) > 0;
  }

  get chartTimeframe(): string {
    const tab = this.activeTab();
    return tab === 'before'
      ? (this.trade?.chartData?.ohlcDataBefore?.timeframe ?? '')
      : (this.trade?.chartData?.ohlcDataAfter?.timeframe ?? '');
  }

  private initChart(): void {
    if (!this.chartContainer || !this.trade) return;

    const tab = this.activeTab();
    const candles = (tab === 'before'
      ? this.trade.chartData?.ohlcDataBefore?.candles
      : this.trade.chartData?.ohlcDataAfter?.candles) ?? [];

    if (!candles.length) return;

    const container = this.chartContainer.nativeElement as HTMLElement;

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
    if (tab === 'after' && this.trade.exitPrice != null) {
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

  get directionLabel(): string {
    return this.trade?.direction?.toLowerCase() === 'buy' ? 'LONG' : 'SHORT';
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
    return (pips >= 0 ? '+' : '') + pips.toFixed(5);
  }
}
