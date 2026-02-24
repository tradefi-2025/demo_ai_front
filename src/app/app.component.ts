import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from './services/auth.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, AsyncPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'FrontDemo';
  name: string = '';


  constructor(public authService: AuthService) {
  }

  ngOnInit(): void {
    this.authService.userDetails$
      .subscribe(userDetails => {
        if (userDetails) {
          this.name = userDetails.name;
        }
      });
  }

}
