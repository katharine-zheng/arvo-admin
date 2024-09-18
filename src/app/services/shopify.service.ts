import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root'
})
export class ShopifyService {
  private _products: any[] = [];
  private getShopifyProductsFn: string = 'shopifyGetProducts';

  constructor(private fn: Functions, private db: DbService) {}

  set products(products: any[]) {
    this._products = products;
  }

  get products(): any[] {
    return this._products;
  }

  async addWebhook(topic: string, functionName: string) {
    const account = this.db.account;
    if (account) {
      const shops: any[] = Object.values(this.db.account.platformStores);
      if (shops && shops[0]) {
        const shop = shops[0].subdomain;
        const accessToken = shops[0].accessToken;
        const params = { topic, functionName, shop, accessToken };
        const url = httpsCallable(this.fn, "shopifyAddWebhook");
        await url(params).then((response: any) => {
        }).catch((error) => {
          console.error(error);
        })
      }
    }
  }

  async getShopifyProducts(storeId: string, shop: string) {
    const account = this.db.account;
    if (account) {
      if (this._products && this._products.length > 0) {
        return this._products;
      }

      const params = { storeId, shop };
      const url = httpsCallable(this.fn, this.getShopifyProductsFn);
      await url(params).then((response: any) => {
        this._products = response.data.products;
        return this._products;
      }).catch((error) => {
        console.error('An error occurred getting Products from Shopify');
        console.error(error);
      })
      return this._products;
    }
    return [];
  }
}
