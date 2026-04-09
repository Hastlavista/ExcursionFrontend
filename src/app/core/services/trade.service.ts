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
    return this.http.post<Trade[]>(`${this.api}/api/trades/gettrades`, {});
  }

  getTradeById(id: string): Observable<Trade> {
    return this.http.post<Trade>(`${this.api}/api/trades/gettrade`, { id });
  }
}
