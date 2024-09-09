import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-dialog',
  templateUrl: './delete-dialog.component.html',
  styleUrl: './delete-dialog.component.css'
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Injecting data, such as product info
  ) {}

  onCancel(): void {
    this.dialogRef.close(false); // Close the dialog without deleting
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Close the dialog and confirm deletion
  }
  
}
