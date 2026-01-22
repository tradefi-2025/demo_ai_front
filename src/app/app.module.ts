import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NouveauAgentComponent } from './nouveau-agent/nouveau-agent.component';
import { ReactiveFormsModule , FormsModule } from "@angular/forms";
import {HttpClientModule} from "@angular/common/http";
import { SigninComponent } from './signin/signin.component';
import { SignupComponent } from './signup/signup.component';
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    NouveauAgentComponent,
    SigninComponent,
    SignupComponent,
    AgentDashboardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
