import { Component } from '@angular/core';
import QRCodeStyling from 'qr-code-styling';
import { QRCodeService } from '../../services/qrcode.service';
import { DbService } from '../../services/db.service';
import { QRCODE } from '../../constants/qrcode';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  qrCodeElement: HTMLElement | undefined | null;
  qrCodeSettings: any;
  qrCodeColor: string = '#000000'; // Default color for QR code
  // qrCodeLogo: any;
  url: string = "https://stance-live-admin.web.app/login";

  constructor(private db: DbService, private qrCodeService: QRCodeService) {}
  
  ngOnInit(): void {
    this.qrCodeSettings = this.db.account.settings.qrCode;
    // this.qrCode.append(document.getElementById("qrCodeContainer")!);

    const logoUrl = "";
    if (this.qrCodeElement) {
      this.qrCodeElement.innerHTML = ""; // Clear existing QR code if any
    }

    this.qrCodeElement = document.getElementById('qrCodeContainer'); // Get the container where the QR code will be rendered
    this.qrCodeService.generateQRCode(this.qrCodeSettings, this.url, logoUrl, this.qrCodeElement!);
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
}
