import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environnement/environment';
import { FeatureInDto } from "../models/request/feature-in-dto";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class FeatureService {

  features!: FeatureInDto;

  private readonly baseUrl = environment.apiBaseUrl;

    constructor(private readonly http: HttpClient) {
  }

  getFeatures(): Observable<FeatureInDto>{
      return this.http.get<FeatureInDto>(this.baseUrl+"/feature/getAll", {
        withCredentials : true
      });
  }
}
