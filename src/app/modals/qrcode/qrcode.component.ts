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
    let data = "";
    if (this.data.product) {
      this.name = this.data.product.name;
      data = `https://arvo-prod.web.app/p/${this.data.product.id}`;
    } else if (this.data.journey) {
      this.name = this.data.journey.name;
    }
    // const logoUrl = 'https://yourdomain.com/assets/logo.png'; // Replace with your logo URL
    const logoUrl = "";
    if (this.qrCodeElement) {
      this.qrCodeElement.innerHTML = "";
    }

    this.qrCodeElement = document.getElementById('qrCodeContainer'); // Get the container where the QR code will be rendered
    this.qrCodeService.generateQRCode(this.data.qrCodeSettings, data, logoUrl, this.qrCodeElement!);
  }

  download(ext: string) {
    this.qrCodeService.download(this.name, ext);
  }

}
