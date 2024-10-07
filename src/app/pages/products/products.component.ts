import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProductFormComponent } from '../../modals/product-form/product-form.component';
import { DbService } from '../../services/db.service';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';
import { Router } from '@angular/router';
import { QRCodeComponent } from '../../modals/qrcode/qrcode.component';
import { ShopifyService } from '../../services/shopify.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  public isLoading: boolean = false;
  public searchTerm: string = "";
  public importedProducts: any[] = [];
  public displayedColumns: string[] = ['image', 'name', 'media', 'actions', 'qr code', 'link'];
  public view: 'grid' | 'table' = 'table';
  public products: any[] = [];
  public filteredProducts: any[] = [];
  public qrCodeElement: HTMLElement | undefined | null;
  private account: any;

  constructor(private router: Router, private dialog: MatDialog, private shopify: ShopifyService, private db: DbService) {}

  ngOnInit() {
    this.getProducts();
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
      }
    });
  }

  async getProducts() {
    this.isLoading = true;
    this.products = await this.db.getProducts();
    this.filteredProducts = this.products;
    this.isLoading = false;
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

  openJourney(product: any, journeyId?: string) {
    this.db.setProductData(product);
    if (journeyId) {
      this.router.navigate(['/journey', journeyId]);
    } else {
      this.router.navigate(['/products', product.id, 'journey']);
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

  openQRCodeModal(product: any) {
    const dialogRef = this.dialog.open(QRCodeComponent, {
      width: '350px',
      data: {
        qrCodeSettings: this.account.settings.qrCode,
        product,
      },
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {}
    });
  }

  openLink(product: any) {
    let url = `https://${this.db.projectId}.web.app/p/${product.id}`
    window.open(url, "_blank");
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
        result['videos'] = [];
        result['videoIds'] = [];
        this.products.push(result);
        this.createProduct(result);
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

  // note for non shopify products
  // openDeleteDialog(product: any) {
  //   const dialogRef = this.dialog.open(DeleteDialogComponent, {
  //     width: '400px',
  //     data: { name: product.name } // Pass the product name to the dialog
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       this.deleteProduct(product.id); // Call the delete method if the user confirms
  //     }
  //   });
  // }

  async createProduct(product: any) {
    this.isLoading = true;
    await this.db.createProduct(product);
    this.isLoading = false;
  }

  // note not used
  async importShopifyProducts() {
    if (this.account.platformStores) {
      const shopValues: any[] = Object.values(this.account.platformStores);
      if (shopValues.length === 0) {
        console.error("");
      } else if (shopValues.length === 1 && shopValues[0]) {
        const shop = shopValues[0].shopDomain;
        const id = shopValues[0].id;
        this.importedProducts = await this.shopify.getProducts(id, shop);
      } else {
        // NOTE only supports one shopify store
      }
    }
  }

  // note also delete journeys - for non shopify products
  // async deleteProduct(productId: string) {
  //   this.isLoading = true;
  //   await this.db.deleteDocument("products", productId);
  //   this.products = this.products.filter(product => product.id !== productId);
  //   this.isLoading = false;
  // }
}
