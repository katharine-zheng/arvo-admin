import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';
import { QRCodeService } from '../../services/qrcode.service';
import { DbService } from '../../services/db.service';
import { QRCodeComponent } from '../../modals/qrcode/qrcode.component';

@Component({
  selector: 'app-journeys',
  templateUrl: './journeys.component.html',
  styleUrl: './journeys.component.css'
})
export class JourneysComponent {
  public journeys: any[] = [];
  public displayedColumns: string[] = ['name', 'type', 'actions', 'qr code'];
  public filteredJourneys: any[] = [];
  public view: 'grid' | 'table' = 'table';
  private account: any;

  constructor(private router: Router, private dialog: MatDialog, private qrCodeService: QRCodeService, private db: DbService) {}

  ngOnInit() {
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
        this.getJourneys();
      }
    });
  }

  async getJourneys() {
    this.journeys = await this.db.getJourneys();
  }

  filterJourneys(searchTerm: string) {
    this.filteredJourneys = this.journeys.filter((journey: any) =>
      journey.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  setView(view: 'grid' | 'table') {
    this.view = view;
  }

  openJourney(journey?: any) {
    if (journey) {
      this.db.setJourneyData(journey);
      this.router.navigate(['/journey', journey.id]);
    } else {
      this.db.setJourneyData(null);
      this.router.navigate(['/journey']);
    }
  }

  openQRCodeModal(journey: any) {
    const dialogRef = this.dialog.open(QRCodeComponent, {
      width: '350px',
      data: {
        qrCodeSettings: this.account.settings.qrCode,
        journey,
      },
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {}
    });
  }

  // openJourneyForm() {
  //   const dialogRef = this.dialog.open(JourneyFormComponent, {
  //     width: '600px',
  //     data: null,
  //     hasBackdrop: true,
  //     disableClose: false, 
  //   });

  //   dialogRef.afterClosed().subscribe(async result => {
  //     if (result) {
  //       this.journeys.push(result);
  //       await this.db.createJourney(result);
  //     }
  //   });
  // }

  // editJourney(journey: any) {
  //   const dialogRef = this.dialog.open(JourneyFormComponent, {
  //     width: '600px',
  //     data: journey,
  //     hasBackdrop: true,
  //     disableClose: false, 
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       this.journeys.push(result);
  //     }
  //   });
  // }

  openDeleteDialog(journey: any) {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '400px',
      data: { name: journey.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteJourney(journey); // Call the delete method if the user confirms
      }
    });
  }

  async deleteJourney(journey: any) {
    const journeyId = journey.id;
    await this.db.deleteJourney(journey);
    this.journeys = this.journeys.filter((journey: { id: string; }) => journey.id !== journeyId);
  }
}
