import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProductFormComponent } from '../../modals/product-form/product-form.component';
import { DbService } from '../../services/db.service';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';
import { QRCodeService } from '../../services/qrcode.service';
import { Router } from '@angular/router';
import { QRCodeComponent } from '../../modals/qrcode/qrcode.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  public searchTerm: string = "";
  journeys: any = {};
  displayedColumns: string[] = ['name', 'actions', 'qr code'];
  public products: any[] = [];
  public filteredProducts: any[] = [];
  view: 'grid' | 'table' = 'table';
  qrCodeElement: HTMLElement | undefined | null; // To store the reference to the QR code container

  constructor(private router: Router, private dialog: MatDialog, private qrCodeService: QRCodeService, private db: DbService) {}

  ngOnInit() {
    this.getProducts();
  }

  async getProducts() {
    this.products = await this.db.getProducts();
    this.filteredProducts = this.products;
  }

  openProduct(product?: any) {
    if (product) {
      this.db.setProductData(product);
      this.router.navigate(['/product', product.id]);
    } else {
      this.db.setProductData(null);
      this.router.navigate(['/product']);
    }
  }

  filterProducts() {
    if (this.searchTerm) {
      this.filteredProducts = this.products.filter((product: any) =>
        product.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = [...this.products];
    }
  }

  clearSearch() {
    this.searchTerm = "";
    this.filteredProducts = [...this.products];
  }

  setView(view: 'grid' | 'table') {
    this.view = view;
  }

  openJourney(product: any) {
    this.db.setProductData(product);  // Set the product data in the service
    this.router.navigate(['/products', product.id, 'journey']);
  }

  openQRCodeModal(product: any) {
    const dialogRef = this.dialog.open(QRCodeComponent, {
      width: '350px',
      data: {
        qrCodeSettings: this.db.account.settings.qrCode,
        product,
      },
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {}
    });
  }

  openProductForm() {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      data: null,
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        result['mediaList'] = [];
        result['mediaIds'] = [];
        this.products.push(result);
        await this.db.createProduct(result);
      }
    });
  }

  editProduct(product: any) {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      data: product,
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.products.push(result);
      }
    });
  }

  openDeleteDialog(product: any) {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '400px',
      data: { name: product.name } // Pass the product name to the dialog
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteProduct(product.id); // Call the delete method if the user confirms
      }
    });
  }

  async deleteProduct(productId: string) {
    await this.db.deleteDocument("products", productId);
    this.products = this.products.filter(product => product.id !== productId);
  }
}
