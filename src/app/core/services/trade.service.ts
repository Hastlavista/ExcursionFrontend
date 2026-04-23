import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trade } from '../models/trade.model';

@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTrades(): Observable<Trade[]> {
    return this.http.get<Trade[]>(`${this.api}/api/journal/gettrades`);
  }

  getTradeById(id: string): Observable<Trade> {
    return this.http.post<Trade>(`${this.api}/api/journal/gettrade`, { id });
  }

  updateTrade(trade: Trade): Observable<any> {
    return this.http.post<any>(`${this.api}/api/journal/updatetrade`, trade);
  }

  updateScreenshot(id: string, screenshotBefore: string | null, screenshotAfter: string | null): Observable<any> {
    return this.http.post<any>(`${this.api}/api/journal/updatescreenshots`, {
      id,
      screenshotBefore,
      screenshotAfter,
    });
  }

  openTrade(payload: Trade): Observable<any> {
    return this.http.post<any>(`${this.api}/api/journal/createtrade`, payload);
  }

  deleteTrade(id: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/api/journal/deletetrade`, { body: { id } });
  }
}
