import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Signal } from '../models/reponse/signal-response';
import { SignalService } from './signal.service';

@Injectable({
  providedIn: 'root'
})
export class SignalPollingService {
  constructor(private readonly signalService: SignalService) {}

  createPollingStream(intervalMs: number): Observable<Signal[]> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.signalService.getUserSignals())
    );
  }
}
