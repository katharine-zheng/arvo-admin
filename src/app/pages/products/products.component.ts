import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProductFormComponent } from '../../modals/product-form/product-form.component';
import { DbService } from '../../services/db.service';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';
import { QRCodeService } from '../../services/qrcode.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  displayedColumns: string[] = ['name', 'journeys', 'actions'];
  products: any[] = [];
  filteredProducts: any[] = [];
  // view: 'grid' | 'table' = 'grid';
  view: 'grid' | 'table' = 'table';
  qrCodeElement: HTMLElement | undefined | null; // To store the reference to the QR code container

  constructor(private router: Router, private dialog: MatDialog, private qrCodeService: QRCodeService, private db: DbService) {}

  ngOnInit() {
    this.getProducts();
  }

  async getProducts() {
    this.products = await this.db.getProducts();
    // this.filterProducts = this.products;
  }

  filterProducts(searchTerm: string) {
    this.filteredProducts = this.products.filter((product: any) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  setView(view: 'grid' | 'table') {
    this.view = view;
  }

  openJourney() {
    this.router.navigate(["journey"]);
  }

  openProductForm() {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      data: null, // Pass data if editing
      hasBackdrop: true, // Ensure there is a backdrop
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        this.products.push(result);
        await this.db.createProduct(result);
      }
    });
  }

  editProduct(product: any) {
    // Open the product form modal with the selected product details pre-filled
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      data: product,
      hasBackdrop: true, // Ensure there is a backdrop
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
    await this.db.deleteProduct(productId);
    this.products = this.products.filter(product => product.id !== productId);
  }

  generateQRCode(product: any) {
    // this.selectedProduct = product;

    // const data = `https://yourdomain.com/products/${product.id}`; // Replace with your product URL or data
    // const logoUrl = 'https://yourdomain.com/assets/logo.png'; // Replace with your logo URL

    const data = "https://stance-live-admin.web.app/login";
    const logoUrl = "";
    if (this.qrCodeElement) {
      this.qrCodeElement.innerHTML = ''; // Clear existing QR code if any
    }

    this.qrCodeElement = document.getElementById('qrCodeContainer'); // Get the container where the QR code will be rendered

    this.qrCodeService.generateQRCode(data, logoUrl, this.qrCodeElement!);
  }
  
  
}
