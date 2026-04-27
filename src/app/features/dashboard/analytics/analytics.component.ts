import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DashboardStateService } from '../../../core/services/dashboard-state.service';
import { Trade, TradeStatus } from '../../../core/models/trade.model';

Chart.register(...registerables);

const ANALYTICS_GREEN = '#5f8f56';
const ANALYTICS_GREEN_RGB = '95, 143, 86';
const ANALYTICS_RED_RGB = '143, 35, 35';

interface WeekdayStat {
  code: string;
  labelKey: string;
  wins: number;
  total: number;
  winRate: number;
}

interface SymbolPnl {
  symbol: string;
  profit: number;
  width: number;
}

interface OutcomeDistribution {
  wins: number;
  losses: number;
  breakeven: number;
  total: number;
  accuracy: number;
}

interface HeatmapCell {
  session: string;
  day: string;
  averageProfit: number;
  total: number;
  intensity: number;
}

interface AnalyticsLabel {
  code: string;
  labelKey: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('equityChart') private equityCanvas?: ElementRef<HTMLCanvasElement>;

  private equityChart?: Chart<'line'>;
  private viewReady = false;

  readonly closedTrades = computed(() =>
    this.state.trades().filter(t => t.status === TradeStatus.Closed)
  );

  readonly totalPnl = computed(() => this.sumProfit(this.closedTrades()));

  readonly todayPnl = computed(() => {
    const now = new Date();
    return this.sumProfit(this.closedTrades().filter(t => t.exitTime && this.isSameDay(new Date(t.exitTime), now)));
  });

  readonly weekPnl = computed(() => {
    const weekStart = this.startOfWeek(new Date());
    return this.sumProfit(this.closedTrades().filter(t => t.exitTime && new Date(t.exitTime) >= weekStart));
  });

  readonly monthPnl = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.sumProfit(this.closedTrades().filter(t => t.exitTime && new Date(t.exitTime) >= monthStart));
  });

  readonly winningTrades = computed(() =>
    this.closedTrades().filter(t => (t.profit ?? 0) > 0)
  );

  readonly losingTrades = computed(() =>
    this.closedTrades().filter(t => (t.profit ?? 0) < 0)
  );

  readonly winRate = computed(() => {
    const total = this.closedTrades().length;
    return total ? (this.winningTrades().length / total) * 100 : 0;
  });

  readonly profitFactor = computed(() => {
    const grossProfit = this.sumProfit(this.winningTrades());
    const grossLoss = Math.abs(this.sumProfit(this.losingTrades()));
    if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
    return grossProfit / grossLoss;
  });

  readonly averageWin = computed(() =>
    this.averageProfit(this.winningTrades())
  );

  readonly averageLoss = computed(() =>
    this.averageProfit(this.losingTrades())
  );

  readonly equitySeries = computed(() => {
    const sorted = [...this.closedTrades()]
      .filter(t => !!t.exitTime)
      .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime());

    let cumulative = 0;
    const labels = [this.translate.instant('ANALYTICS.EQUITY.START')];
    const values = [0];

    for (const trade of sorted) {
      cumulative += trade.profit ?? 0;
      labels.push(this.formatShortDate(trade.exitTime!));
      values.push(Number(cumulative.toFixed(2)));
    }

    return { labels, values };
  });

  readonly weekdayStats = computed<WeekdayStat[]>(() => {
    const buckets = this.weekdayLabels.map(day => ({ ...day, wins: 0, total: 0, winRate: 0 }));

    for (const trade of this.closedTrades()) {
      if (!trade.exitTime) continue;
      const dayIndex = (new Date(trade.exitTime).getDay() + 6) % 7;
      buckets[dayIndex].total += 1;
      if ((trade.profit ?? 0) > 0) buckets[dayIndex].wins += 1;
    }

    return buckets.map(day => ({
      ...day,
      winRate: day.total ? (day.wins / day.total) * 100 : 0,
    }));
  });

  readonly symbolPnl = computed<SymbolPnl[]>(() => {
    const totals = new Map<string, number>();
    for (const trade of this.closedTrades()) {
      const symbol = trade.symbol || this.translate.instant('ANALYTICS.UNKNOWN_SYMBOL');
      totals.set(symbol, (totals.get(symbol) ?? 0) + (trade.profit ?? 0));
    }

    const rows = Array.from(totals.entries())
      .map(([symbol, profit]) => ({ symbol, profit, width: 0 }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 8);

    const maxAbs = Math.max(...rows.map(row => Math.abs(row.profit)), 1);
    return rows.map(row => ({ ...row, width: Math.max(5, (Math.abs(row.profit) / maxAbs) * 46) }));
  });

  readonly outcomeDistribution = computed<OutcomeDistribution>(() => {
    const wins = this.winningTrades().length;
    const losses = this.losingTrades().length;
    const breakeven = this.closedTrades().filter(t => (t.profit ?? 0) === 0).length;
    const total = this.closedTrades().length;
    return {
      wins,
      losses,
      breakeven,
      total,
      accuracy: total ? (wins / total) * 100 : 0,
    };
  });

  readonly weekdayLabels: AnalyticsLabel[] = [
    { code: 'MON', labelKey: 'ANALYTICS.DAYS.MON' },
    { code: 'TUE', labelKey: 'ANALYTICS.DAYS.TUE' },
    { code: 'WED', labelKey: 'ANALYTICS.DAYS.WED' },
    { code: 'THU', labelKey: 'ANALYTICS.DAYS.THU' },
    { code: 'FRI', labelKey: 'ANALYTICS.DAYS.FRI' },
    { code: 'SAT', labelKey: 'ANALYTICS.DAYS.SAT' },
    { code: 'SUN', labelKey: 'ANALYTICS.DAYS.SUN' },
  ];
  readonly heatmapDays = this.weekdayLabels.slice(0, 5);
  readonly marketSessions = [
    { code: 'ASIA', labelKey: 'ANALYTICS.SESSIONS.ASIA', start: 0, end: 7 },
    { code: 'LONDON', labelKey: 'ANALYTICS.SESSIONS.LONDON', start: 7, end: 12 },
    { code: 'NY_LON', labelKey: 'ANALYTICS.SESSIONS.NY_LON', start: 12, end: 16 },
    { code: 'NEW_YORK', labelKey: 'ANALYTICS.SESSIONS.NEW_YORK', start: 16, end: 21 },
  ];

  readonly intradayHeatmap = computed<HeatmapCell[]>(() => {
    const buckets = new Map<string, { profit: number; total: number }>();

    for (const trade of this.closedTrades()) {
      if (!trade.entryTime) continue;
      const start = new Date(trade.entryTime);
      const end = trade.exitTime ? new Date(trade.exitTime) : start;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      const touched = this.touchedMarketBuckets(start, end);
      for (const key of touched) {
        const bucket = buckets.get(key) ?? { profit: 0, total: 0 };
        bucket.profit += trade.profit ?? 0;
        bucket.total += 1;
        buckets.set(key, bucket);
      }
    }

    const averages = Array.from(buckets.values()).map(bucket => Math.abs(bucket.profit / bucket.total));
    const maxAverage = Math.max(...averages, 1);
    const cells: HeatmapCell[] = [];

    for (const session of this.marketSessions) {
      for (const day of this.heatmapDays) {
        const key = `${day.code}:${session.code}`;
        const bucket = buckets.get(key);
        const averageProfit = bucket ? bucket.profit / bucket.total : 0;
        cells.push({
          session: session.code,
          day: day.code,
          averageProfit,
          total: bucket?.total ?? 0,
          intensity: bucket ? Math.max(0.18, Math.abs(averageProfit) / maxAverage) : 0,
        });
      }
    }

    return cells;
  });

  constructor(
    public state: DashboardStateService,
    private translate: TranslateService
  ) {
    effect(() => {
      this.equitySeries();
      this.weekdayStats();
      if (this.viewReady) {
        queueMicrotask(() => this.renderCharts());
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.equityChart?.destroy();
  }

  formatCurrency(value: number): string {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatProfitFactor(value: number): string {
    if (!Number.isFinite(value)) return '∞';
    return value.toFixed(2);
  }

  trackByLabel(_: number, item: WeekdayStat): string {
    return item.code;
  }

  trackByCode(_: number, item: AnalyticsLabel): string {
    return item.code;
  }

  heatmapCell(session: string, day: string): HeatmapCell {
    return this.intradayHeatmap().find(cell => cell.session === session && cell.day === day)
      ?? { session, day, averageProfit: 0, total: 0, intensity: 0 };
  }

  heatmapBackground(cell: HeatmapCell): string {
    if (!cell.total) return 'rgba(125, 148, 181, 0.08)';
    const color = cell.averageProfit >= 0 ? ANALYTICS_GREEN_RGB : ANALYTICS_RED_RGB;
    return `rgba(${color}, ${Math.min(0.9, cell.intensity * 0.72 + 0.14)})`;
  }

  heatmapTitle(session: AnalyticsLabel, day: AnalyticsLabel, cell: HeatmapCell): string {
    return this.translate.instant('ANALYTICS.HEATMAP.CELL_TITLE', {
      session: this.translate.instant(session.labelKey),
      day: this.translate.instant(day.labelKey),
      profit: this.formatCurrency(cell.averageProfit),
      total: cell.total,
    });
  }

  private renderCharts(): void {
    this.renderEquityChart();
  }

  private renderEquityChart(): void {
    if (!this.equityCanvas) return;
    const series = this.equitySeries();
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [{
          data: series.values,
          borderColor: ANALYTICS_GREEN,
          backgroundColor: `rgba(${ANALYTICS_GREEN_RGB}, 0.1)`,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.32,
          fill: true,
        }],
      },
      options: this.baseChartOptions('currency'),
    };

    this.equityChart?.destroy();
    this.equityChart = new Chart(this.equityCanvas.nativeElement, config);
  }

  private baseChartOptions(kind: 'currency' | 'percent'): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: '#091322',
          borderColor: 'rgba(125, 148, 181, 0.18)',
          borderWidth: 1,
          titleColor: '#dce7f8',
          bodyColor: '#dce7f8',
          callbacks: {
            label: (ctx: any) => {
              const value = Number(ctx.parsed.y ?? 0);
              return kind === 'currency' ? this.formatCurrency(value) : this.formatPercent(value);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(125, 148, 181, 0.06)' },
          ticks: { color: '#71809a', maxRotation: 0, autoSkip: true },
          border: { color: 'rgba(125, 148, 181, 0.12)' },
        },
        y: {
          beginAtZero: kind === 'percent',
          suggestedMax: kind === 'percent' ? 100 : undefined,
          grid: { color: 'rgba(125, 148, 181, 0.08)' },
          ticks: {
            color: '#71809a',
            callback: (value: string | number) => kind === 'currency' ? `$${value}` : `${value}%`,
          },
          border: { color: 'rgba(125, 148, 181, 0.12)' },
        },
      },
    };
  }

  private sumProfit(trades: Trade[]): number {
    return trades.reduce((sum, trade) => sum + (trade.profit ?? 0), 0);
  }

  private averageProfit(trades: Trade[]): number {
    return trades.length ? this.sumProfit(trades) / trades.length : 0;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private startOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
    return start;
  }

  private formatShortDate(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  private touchedMarketBuckets(start: Date, end: Date): Set<string> {
    const result = new Set<string>();
    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);
    const finish = end >= start ? end : start;
    const maxHours = 24 * 7;
    let hours = 0;

    while (cursor <= finish && hours <= maxHours) {
      const dayIndex = (cursor.getDay() + 6) % 7;
      const day = this.weekdayLabels[dayIndex];
      const session = this.marketSessions.find(item => cursor.getUTCHours() >= item.start && cursor.getUTCHours() < item.end);
      if (day && session) {
        result.add(`${day.code}:${session.code}`);
      }
      cursor.setHours(cursor.getHours() + 1);
      hours += 1;
    }

    if (!result.size) {
      const dayIndex = (start.getDay() + 6) % 7;
      const day = this.weekdayLabels[dayIndex];
      const session = this.marketSessions.find(item => start.getUTCHours() >= item.start && start.getUTCHours() < item.end);
      if (day && session) result.add(`${day.code}:${session.code}`);
    }

    return result;
  }
}
