import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NouveauAgentComponent } from './nouveau-agent/nouveau-agent.component';
import { ConsulterAgentComponent } from './consulter-agent/consulter-agent.component';
import { ReactiveFormsModule , FormsModule } from "@angular/forms";
import {HttpClientModule} from "@angular/common/http";
import { SigninComponent } from './signin/signin.component';
import { SignupComponent } from './signup/signup.component';

@NgModule({
  declarations: [
    AppComponent,
    NouveauAgentComponent,
    ConsulterAgentComponent,
    SigninComponent,
    SignupComponent,
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
