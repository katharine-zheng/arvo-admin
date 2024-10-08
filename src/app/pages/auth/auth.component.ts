import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {

  public email: string = "";
  public password: string = "";
  public isLoginMode: boolean = true; // Toggle between login and registration
  public platforms: any = {};
  private params: any;

  constructor(private route: ActivatedRoute, private router: Router, private auth: AuthService, private db: DbService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.params = params;
      const shop = params['shop'];
      const hmac = params['hmac'];
      if (shop && hmac) {
        this.platforms.shopify = true;
      } else if (this.auth.uid) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  removeMyShopifyDomain(shopName: string) {
    return shopName.replace('.myshopify.com', '');
  }

  // Toggle between login and registration modes
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  onSendSignInLink(): void {
    if (this.email) {
      this.auth.sendSignInLink(this.email);
    }
  }

  // Handle form submission based on the mode
  async onSubmit(): Promise<void> {
    if (this.isLoginMode) {
      await this.auth.login(this.email, this.password);
    } else if (this.platforms.shopify) {
      await this.auth.register(this.email, this.password, this.platforms);
    } else {
      await this.auth.register(this.email, this.password);
    }

    if (this.params) {
      this.router.navigate(['/shopify'], { queryParams: this.params });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
