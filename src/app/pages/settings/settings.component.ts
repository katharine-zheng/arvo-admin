import { Component } from '@angular/core';
import QRCodeStyling from 'qr-code-styling';
import { QRCodeService } from '../../services/qrcode.service';
import { DbService } from '../../services/db.service';
import { QRCODE } from '../../constants/qrcode';
import { ShopifyService } from '../../services/shopify.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  qrCodeElement: HTMLElement | undefined | null;
  qrCodeSettings: any;
  qrCodeColor: string = '#000000';
  url: string = "https://stance-live-admin.web.app/login";

  public account: any;
  public webhooks: any[] = [];
  public registeredWebhooks: any[] = [];

  constructor(private db: DbService, private qrCodeService: QRCodeService, private shopify: ShopifyService) {}
  
  ngOnInit(): void {
    this.account = this.db.account;
    this.initSettings();
    this.getWebhooks();
  }

  initSettings() {
    if (this.db.account) {
      this.qrCodeSettings = this.db.account.settings.qrCode;

      const logoUrl = "";
      if (this.qrCodeElement) {
        this.qrCodeElement.innerHTML = "";
      }

      this.qrCodeElement = document.getElementById('qrCodeContainer');
      this.qrCodeService.generateQRCode(this.qrCodeSettings, this.url, logoUrl, this.qrCodeElement!);
    }
  }

  uploadLogo(event: any) {
    const qrCodeLogo = this.qrCodeService.uploadLogo(event);
    this.qrCodeSettings.image = qrCodeLogo;
  }

  removeLogo() {
    this.qrCodeSettings.image = null;
    // this.qrCodeLogo = null;  // Clear the logo variable
    this.qrCodeService.changeQRCode({
      image: null  // Remove the logo from the QR code
    });
  }

  // Update QR code when color changes
  changeQRCodeColor() {
    this.qrCodeSettings.cornersDotOptions.color = this.qrCodeSettings.cornersSquareOptions.color;
  }

  async updateQRCode() {
    this.qrCodeService.changeQRCode(this.qrCodeSettings);
  }

  async update() {
    await this.db.updateQRSettings(this.qrCodeSettings);
  }


  // shopify webhooks
  async addWebhook(topic: string) {
    let functionName;
    if (topic === 'products/create') {
      functionName = 'OnProductsCreate';
    } else if (topic === 'products/update') {
      functionName = 'OnProductsUpdate';
    } else if (topic === 'products/delete') {
      functionName = 'OnProductsDelete';
    } else {
      functionName = 'OnAppUninstall';
    }
    await this.shopify.addWebhook(topic, functionName);
  }

  async deleteWebhook(webhookId: string) {
    if (this.account.platformStores) {
      const shopValues: any[] = Object.values(this.db.account.platformStores);
      if (shopValues.length === 0) {
        console.error("");
      } else if (shopValues.length === 1 && shopValues[0]) {
        const shop = shopValues[0].subdomain;
        const id = shopValues[0].id;
        await this.shopify.deleteWebhook(shop, id, webhookId);
      } else {
        // NOTE only supports one shopify store
      }
    }
  }

  async getWebhooks() {
    if (this.account.platformStores) {
      const shopValues: any[] = Object.values(this.db.account.platformStores);
      if (shopValues.length === 0) {
        console.error("");
      } else if (shopValues.length === 1 && shopValues[0]) {
        const shop = shopValues[0].subdomain;
        const id = shopValues[0].id;
        // this.accountWebhooks = shopValues[0].webhooks;
        this.webhooks = await this.shopify.getWebhooks(shop, id);
        console.log(this.webhooks);
      } else {
        // NOTE only supports one shopify store
      }
    }
  }
}
