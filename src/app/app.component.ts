import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'FrontDemo';
  name : string = ''


  constructor(public authService: AuthService ) {

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
