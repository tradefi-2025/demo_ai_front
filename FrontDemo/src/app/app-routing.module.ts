import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ConsulterAgentComponent} from "./consulter-agent/consulter-agent.component";
import {NouveauAgentComponent} from "./nouveau-agent/nouveau-agent.component";

const routes: Routes = [
  { path : 'nouveau-agent' ,  component : NouveauAgentComponent } ,
  { path : 'consulter-agent' ,  component : ConsulterAgentComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
