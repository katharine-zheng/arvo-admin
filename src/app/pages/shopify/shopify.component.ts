import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShopifyService } from '../../services/shopify.service';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
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
        const exists = await this.db.shopifyAccountExists(id, shopName);
        if (exists) {
          this.isLoading = false;
          return;
        }

        // add the shopify name to the account
        await this.db.addShopifyToAccount(shopName);

        const queryParamsArray = [];
        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(params[key]);
            queryParamsArray.push(`${encodedKey}=${encodedValue}`);
          }
        }

        let oauthUrl = `https://us-central1-arvo-prod.cloudfunctions.net/initAuth?`;
        // Join all key-value pairs with '&' and append them to the base URL
        oauthUrl += queryParamsArray.join('&');

        // Redirect to the final Firebase Function URL with appended query parameters
        // this.auth.saveSession();
        this.isLoading = false;
        window.location.href = oauthUrl;
      }
    });
  }
}
