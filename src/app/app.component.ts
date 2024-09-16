import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './services/auth.service';
import { onAuthStateChanged } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';
import { DbService } from './services/db.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  public currentPage: any;

  constructor(private fAuth: Auth, private authService: AuthService, private route: ActivatedRoute, private router: Router, private db: DbService) {}

  ngOnInit(): void {
    onAuthStateChanged(this.fAuth, (user) => {
      if (user) {
        this.isAuthenticated = true;
      } else if (this.router.url.startsWith('/shopify') || this.router.url.startsWith('/auth')) {
        // this.route.queryParams.subscribe(params => {
        //   this.router.navigate(['/auth'], { queryParams: params });
        // });
      } else {
        this.isAuthenticated = false;
        this.router.navigate(['/auth']);
      }
    });

    // const storedUser = sessionStorage.getItem('firebaseUser');
    // if (storedUser) {
    //   const user = JSON.parse(storedUser);
    //   this.isAuthenticated = true;
    //   this.router.navigate(['/dashboard']);
    // } else {
    //   // onAuthStateChanged
    // }
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
