import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environnement/environment';
import { Signal, UpdateSignalStatusRequest } from '../models/reponse/signal-response';

@Injectable({
  providedIn: 'root'
})
export class SignalService {
  private readonly baseUrl = `${environment.apiBaseUrl}/signal`;

  constructor(private readonly http: HttpClient) {}

  getUserSignals(): Observable<Signal[]> {
    return this.http.get<Signal[]>(
      `${this.baseUrl}/userSignals`,
      { withCredentials: true }
    );
  }

  updateSignalStatus(signalId: number, payload: UpdateSignalStatusRequest): Observable<Signal> {
    return this.http.patch<Signal>(
      `${this.baseUrl}/${signalId}/status`,
      payload,
      { withCredentials: true }
    );
  }

  deleteSignal(signalId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${signalId}`,
      { withCredentials: true }
    );
  }
}
