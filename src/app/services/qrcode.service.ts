import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import QRCodeStyling from 'qr-code-styling';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {

  generateQRCode(data: string, logoUrl: string, element: HTMLElement) {
    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      data: data, // The data that the QR code will encode
      image: logoUrl, // URL to your logo image
      type: "svg",
      dotsOptions: {
        color: "#4267B2", // Color of the QR code dots (customize as needed)
        type: "rounded", // Shape of the QR code dots
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
      },
      cornersDotOptions: {
        type: "dot",
      },
      imageOptions: {
        crossOrigin: "anonymous", // To handle CORS issues
        margin: 20, // Margin around the logo image
      },
    });

    // Render the QR code in the provided HTML element
    qrCode.append(element);
  }
}
