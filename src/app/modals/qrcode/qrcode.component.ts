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
  qrCodeElement: HTMLElement | undefined | null;
  id: string = "";

  constructor(
    private qrCodeService: QRCodeService,
    public dialogRef: MatDialogRef<QRCodeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, // Injected product data for editing
  ) {}

  ngOnInit(): void {
    // const data = `https://yourdomain.com/journeys/${product.id}`; // Replace with your product URL or data
    // const logoUrl = 'https://yourdomain.com/assets/logo.png'; // Replace with your logo URL
    this.id = this.data.journey.id;
    const data = "https://stance-live-admin.web.app/login";
    const logoUrl = "";
    if (this.qrCodeElement) {
      this.qrCodeElement.innerHTML = ''; // Clear existing QR code if any
    }

    this.qrCodeElement = document.getElementById('qrCodeContainer'); // Get the container where the QR code will be rendered
    this.qrCodeService.generateQRCode(this.data.qrCodeSettings, data, logoUrl, this.qrCodeElement!);
  }

  download(ext: string) {
    this.qrCodeService.download(this.data.journey.name, ext);
  }

}
