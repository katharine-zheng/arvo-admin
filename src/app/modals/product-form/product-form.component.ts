import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent {
  productForm: FormGroup 
  isEditMode: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ProductFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, // Injected product data for editing
    private fb: FormBuilder,
    // private productService: ProductService
  ) {
    this.isEditMode = !!data; // Check if we are in edit mode
    this.productForm = this.fb.group({
      name: [this.data?.name || '', Validators.required],
      // description: [this.data?.description || '', Validators.required],
      price: [this.data?.price || '', Validators.required],
    });
  }

  // Save the product (either new or edited)
  onSave() {
    if (this.productForm.valid) {
      const updatedProduct = this.productForm.value;
      this.dialogRef.close(updatedProduct);
    }
  }

  // Close the dialog without saving
  onCancel() {
    this.dialogRef.close();
  }
}
