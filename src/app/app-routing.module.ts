import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {NouveauAgentComponent} from "./nouveau-agent/nouveau-agent.component";
import { SignupComponent } from './signup/signup.component';
import { SigninComponent } from './signin/signin.component';
import { AuthGuard } from './guard/authGuard.guard';
import { AuthSignGuard } from "./guard/authSignIn.gaurd"
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';

const routes: Routes = [
  { path : '' , component : NouveauAgentComponent , canActivate: [AuthGuard]},
  { path : 'nouveau-agent' ,  component : NouveauAgentComponent  , canActivate : [AuthGuard]} ,
  { path : 'agent-dashboard' ,  component : AgentDashboardComponent , canActivate : [AuthGuard]},
  { path : 'sign-up' , component : SignupComponent , canActivate : [AuthSignGuard]},
  { path : 'sign-in' , component : SigninComponent , canActivate : [AuthSignGuard]},
  { path : 'sign-out' , redirectTo : '/sign-in' },
  { path : '**' , redirectTo : '/sign-in' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
