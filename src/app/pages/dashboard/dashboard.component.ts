import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { UploadModalComponent } from '../../modals/upload-modal/upload-modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private account: any;
  public isLoading: boolean = false;

  constructor(private db: DbService, private dialog: MatDialog) {}
  
  ngOnInit(): void {
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
      }
    });
  }

  openUploadModal() {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '600px',
      data: null,
      hasBackdrop: true,
      disableClose: true, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        alert('Success! Proceed to the media library to see your new upload(s)');
      }
    });
  }
}
