export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcData {
  timeframe: string;
  entryTime: string;
  candles: Candle[];
}

export interface ChartData {
  ohlcDataBefore?: OhlcData;
  ohlcDataAfter?: OhlcData;
  screenshotUrlBefore?: string | null;
  screenshotUrlAfter?: string | null;
}

export enum TradeStatus {
  Open = 'Open',
  Closed = 'Closed'
}

export enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

export interface Trade {
  id: string;
  externalId?: number | null;
  symbol: string;
  direction: Direction;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lotSize?: number | null;
  profit?: number | null;
  profitPips?: number | null;
  mae?: number | null;
  mfe?: number | null;
  efficiency?: number | null;
  entryTime: string;
  exitTime?: string | null;
  durationMinutes?: number | null;
  chartData?: ChartData;
  status: TradeStatus;
  updatedAt: string;
  createdAt: string;
}
