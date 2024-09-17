import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DbService } from '../../services/db.service';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-shopify',
  templateUrl: './shopify.component.html',
  styleUrl: './shopify.component.css'
})
export class ShopifyComponent {
  public isLoading: boolean = false;
  constructor(private fAuth: Auth, private route: ActivatedRoute, private router: Router, private db: DbService) {}

  ngOnInit(): void {
    onAuthStateChanged(this.fAuth, (user) => {
      if (user) {
        this.initShopifyAuth(user.uid);
        // this.route.queryParams.subscribe(async params => {
        //   this.shopify.initShopifyAuth(user.uid, params);
        // });
      } else {
        this.route.queryParams.subscribe(params => {
          this.router.navigate(['/auth'], { queryParams: params });
        });
      }
    });
  }

  initShopifyAuth(id: string) {
    this.route.queryParams.subscribe(async params => {
      const shop = params['shop'];
      const hmac = params['hmac'];
      // const code = params['code'];
      // const state = params['state'];
      // const timestamp = params['timestamp'];
      if (shop && hmac) {
        this.isLoading = true;
        const shopName = shop.replace('.myshopify.com', '');
        // check to see if this shop already exists in the account
        if (!this.db.account) {
          await this.db.getAccount(id);
        }
        if (this.db.account) {
          const exists = await this.db.shopifyAccountExists(shopName);
          if (exists) {
            this.isLoading = false;
            return;
          }

          const queryParamsArray = [];
          for (const key in params) {
            if (params.hasOwnProperty(key)) {
              const encodedKey = encodeURIComponent(key);
              const encodedValue = encodeURIComponent(params[key]);
              queryParamsArray.push(`${encodedKey}=${encodedValue}`);
            }
          }

          queryParamsArray.push(`state=${this.db.account.id}`);

          let oauthUrl = `https://us-central1-arvo-prod.cloudfunctions.net/shopifyInitAuth?`;
          oauthUrl += queryParamsArray.join('&');
          // this.auth.saveSession();
          this.isLoading = false;
          // Redirect to the final Firebase Function URL with query parameters
          window.location.href = oauthUrl;
        }
      }
    });
  }
}
