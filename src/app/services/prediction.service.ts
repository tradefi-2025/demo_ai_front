import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environnement/environment';
import { PredictionResponse } from '../models/reponse/prediction-response';
import { PredictionRequest } from '../models/request/prediction-request';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {

  private readonly baseUrl = environment.apiUrl + '/prediction';

  constructor(private readonly http: HttpClient) {}

  predict(request: PredictionRequest): Observable<PredictionResponse> {
    return this.http.post<PredictionResponse>(
      `${this.baseUrl}/predict`,
      request,
      { withCredentials: true }
    );
  }

  getUserPredictions(): Observable<PredictionResponse[]> {
    return this.http.get<PredictionResponse[]>(
      `${this.baseUrl}/userPredictions`,
      { withCredentials: true }
    );
  }

  getPredictionsByAgentId(agentId: number): Observable<PredictionResponse[]> {
    return this.http.get<PredictionResponse[]>(
      `${this.baseUrl}/agent/${agentId}`,
      { withCredentials: true }
    );
  }
}
