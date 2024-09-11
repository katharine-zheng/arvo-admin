import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import QRCodeStyling from 'qr-code-styling';
import { Observable } from 'rxjs';
import { DbService } from './db.service';
import { QRCODE } from '../constants/qrcode';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {

  private qrCode: QRCodeStyling | undefined;

  constructor(private db: DbService) {}

  generateQRCode(settings: any, data: string, logoUrl: string, element: HTMLElement) {
    // const qrSettings = this.db.account.settings.qrCode;
    // const qrSettings = QRCODE;
    settings['data'] = data;
    this.qrCode = new QRCodeStyling(settings);
    this.qrCode.append(element);
  }

  changeQRCode(item: any) {
    this.qrCode!.update(item);
  }

  // NOTE not used
  uploadLogo(event: any) {
    const file = event.target.files[0];
    let logo;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        logo = e.target.result;  // Set base64 image as logo
        this.qrCode!.update({
          image: logo,  // Update the QR code with the new logo
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 10 // Margin around the logo
          }
        });
        await this.update(logo);
        return e.target.result;
      };
      reader.readAsDataURL(file);  // Convert the file to base64
    }
  }

  download(name: string, ext?: any) {
    this.qrCode!.download({ name: name, extension: ext ? ext : 'png' });
  }

  async update(logo: string) {
    await this.db.updateQRSettings({
      image: logo
    });
  }
}
