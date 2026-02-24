import { Routes } from '@angular/router';
import { NouveauAgentComponent } from './nouveau-agent/nouveau-agent.component';
import { SignupComponent } from './signup/signup.component';
import { SigninComponent } from './signin/signin.component';
import { AgentDashboardComponent } from './agent-dashboard/agent-dashboard.component';
import { authGuard } from './guard/authGuard.guard';
import { authSignGuard } from './guard/authSignIn.gaurd';

export const routes: Routes = [
  { path: '', component: NouveauAgentComponent, canActivate: [authGuard] },
  { path: 'nouveau-agent', component: NouveauAgentComponent, canActivate: [authGuard] },
  { path: 'agent-dashboard', component: AgentDashboardComponent, canActivate: [authGuard] },
  { path: 'sign-up', component: SignupComponent, canActivate: [authSignGuard] },
  { path: 'sign-in', component: SigninComponent, canActivate: [authSignGuard] },
  { path: 'sign-out', redirectTo: '/sign-in' },
  { path: '**', redirectTo: '/sign-in' }
];

