import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  public currentPage: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.isLoggedIn().subscribe(isLoggedIn => {
      this.isAuthenticated = isLoggedIn;

      // If not authenticated, redirect to the auth page
      if (!isLoggedIn) {
        this.router.navigate(['/auth']);
      }
    });
  }

  openPage(title: string, page: string) {
    this.currentPage = title;
    this.router.navigate([page]);
  }

  async signOut() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
