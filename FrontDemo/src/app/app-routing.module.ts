import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ConsulterAgentComponent} from "./consulter-agent/consulter-agent.component";
import {NouveauAgentComponent} from "./nouveau-agent/nouveau-agent.component";
import { SignupComponent } from './signup/signup.component';
import { SigninComponent } from './signin/signin.component';
import { AuthGuard } from './guard/authGuard.guard';
import { AuthSignGuard } from "./guard/authSignIn.gaurd"
import { AppComponent } from './app.component';

const routes: Routes = [
  { path : '' , component : NouveauAgentComponent , canActivate: [AuthGuard]},
  { path : 'nouveau-agent' ,  component : NouveauAgentComponent  , canActivate : [AuthGuard]} ,
  { path : 'consulter-agent' ,  component : ConsulterAgentComponent , canActivate : [AuthGuard]},
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
