import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environnement/environment';
import { OperationResponse } from '../models/reponse/operation-response';

interface AgentActionRequest {
  agentId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiAgentService {
  private readonly baseUrl = `${environment.aiBaseUrl}/agent`;

  constructor(private readonly http: HttpClient) {}

  launchAgent(agentId: number): Observable<OperationResponse> {
    return this.http.post<OperationResponse>(
      `${this.baseUrl}/launch`,
      { agentId } satisfies AgentActionRequest,
      { withCredentials: true }
    );
  }

  deactivateAgent(agentId: number): Observable<OperationResponse> {
    return this.http.post<OperationResponse>(
      `${this.baseUrl}/deactivate`,
      { agentId } satisfies AgentActionRequest,
      { withCredentials: true }
    );
  }

  requestInference(agentId: number): Observable<OperationResponse> {
    return this.http.post<OperationResponse>(
      `${this.baseUrl}/inference`,
      { agentId } satisfies AgentActionRequest,
      { withCredentials: true }
    );
  }
}
