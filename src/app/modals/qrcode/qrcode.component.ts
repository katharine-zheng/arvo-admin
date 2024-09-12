import { Component, Inject, OnInit } from '@angular/core';
import { QRCodeService } from '../../services/qrcode.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-qrcode',
  templateUrl: './qrcode.component.html',
  styleUrl: './qrcode.component.css'
})
export class QRCodeComponent implements OnInit {
  public name: string = "";
  qrCodeElement: HTMLElement | undefined | null;

  constructor(
    private qrCodeService: QRCodeService,
    public dialogRef: MatDialogRef<QRCodeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, // Injected product data for editing
  ) {}

  ngOnInit(): void {
    // const data = `https://yourdomain.com/journeys/${product.id}`; // Replace with your product URL or data
    // const logoUrl = 'https://yourdomain.com/assets/logo.png'; // Replace with your logo URL
    const data = "https://stance-live-admin.web.app/login";
    const logoUrl = "";
    if (this.qrCodeElement) {
      this.qrCodeElement.innerHTML = "";
    }

    if (this.data.product) {
      this.name = this.data.product.name;
    } else if (this.data.journey) {
      this.name = this.data.journey.name;
    }
    this.qrCodeElement = document.getElementById('qrCodeContainer'); // Get the container where the QR code will be rendered
    this.qrCodeService.generateQRCode(this.data.qrCodeSettings, data, logoUrl, this.qrCodeElement!);
  }

  download(ext: string) {
    this.qrCodeService.download(this.name, ext);
  }

}
