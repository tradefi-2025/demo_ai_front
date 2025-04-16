import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environnement/environment';
import { FeatureInDto } from "../models/request/feature-in-dto";
import {Observable, tap} from "rxjs";
import { AgentFormDTO } from '../models/request/new-agent-form-dto';

@Injectable({
  providedIn: 'root'
})
export class InfoService {

  features!: FeatureInDto;
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {
  }


  getFeatures(): Observable<FeatureInDto>{
    return this.http.get<FeatureInDto>(this.baseUrl+"/features");
  }

  createAgent(agentFormDTO : AgentFormDTO): Observable<boolean>{
    return this.http.post<boolean>(this.baseUrl+"/createAgent",agentFormDTO)
  }

}
