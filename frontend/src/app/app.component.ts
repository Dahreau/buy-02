import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService} from "./services/auth.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
    public isLoggedIn$: Observable<boolean>;

    constructor(private authService: AuthService) {
        this.isLoggedIn$ = this.authService.isLoggedIn$;
    }

    logout(): void {
        this.authService.logout();
    }
}
