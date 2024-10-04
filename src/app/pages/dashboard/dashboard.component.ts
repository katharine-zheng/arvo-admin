import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { UploadModalComponent } from '../../modals/upload-modal/upload-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AnalyticsService } from '../../services/analytics.service';
import { DateUtilsService } from '../../services/date-utils.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private account: any;
  public isLoading: boolean = false;
  public selectedDateRange: string = '7';
  public maxDateLimit: Date = new Date();
  public minDateLimit: Date = new Date(new Date().setDate(new Date().getDate() - 31));

  public startDateString: string = "";  // YYYY-MM-DD for cloud function
  public endDateString: string = "";    // YYYY-MM-DD for cloud function
  public startDateGA: string = "";      // YYYYMMDD for GA data processing
  public endDateGA: string = "";        // YYYYMMDD for GA data processing

  // Data for multiple charts
  public chart1Labels: string[] = [];
  public chart1Dataset: any[] = [];

  public chart2Labels: string[] = [];
  public chart2Dataset: any[] = [];

  public dateRange = {
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  };

  constructor(private db: DbService, private dialog: MatDialog, private dateUtils: DateUtilsService, private analytics: AnalyticsService) {}
  
  ngOnInit(): void {
    this.updateDateStrings();
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
        if (this.account.mediaList && this.account.mediaList.length > 0) {
          this.initCharts();
        }
      }
    });
  }

  async initCharts() {
    const chart1Data = await this.getGAReport(1, "sessions");
    if (chart1Data) {
      this.chart1Labels = chart1Data.map(data => this.dateUtils.formatDateForDisplay(data.date));
      this.chart1Dataset = chart1Data.map(data => data.sessions);
    }

    const chart2Data = await this.getGAReport(2, "sessions");
    if (chart2Data) {
      this.chart2Labels = chart2Data.map(data => this.dateUtils.formatDateForDisplay(data.date));
      this.chart2Dataset = chart2Data.map(data => data.sessions);
    }
  }

  updateDateStrings() {
    this.startDateString = this.dateUtils.formatDateToISO(this.dateRange.start);  // YYYY-MM-DD
    this.endDateString = this.dateUtils.formatDateToISO(this.dateRange.end);      // YYYY-MM-DD
    this.startDateGA = this.dateUtils.formatDateForGA(this.dateRange.start);       // YYYYMMDD
    this.endDateGA = this.dateUtils.formatDateForGA(this.dateRange.end);           // YYYYMMDD
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

  onDateRangeSelect(range: string): void {
    const today = new Date();

    if (range !== 'custom') {
      const daysAgo = parseInt(range, 10);  // Convert range to a number of days
      this.dateRange.start = new Date(today.setDate(today.getDate() - daysAgo));
      this.dateRange.end = new Date();  // Reset to today
      this.updateDateStrings();
      this.initCharts();
    }
  }

  
  onDateRangeChange(): void {
    this.updateDateStrings();
    this.initCharts();
  }

  async getGAReport(chartId: number, metrics: string) {
    const key = `${chartId}_${this.startDateString}_${this.endDateString}_${metrics}`;
    const params: any = {
      dateRanges: [{ startDate: this.startDateString, endDate: this.endDateString }],
      dimensions: [{ name: 'date' }, {name: "streamId"}],
      metrics: [{ name: metrics }]
    };
  
    const response: any = await this.analytics.getGAReport(key, params);
    if (response) {
      // Generate a list of all dates within the date range
      const allDates = this.dateUtils.getAllDatesInRange(this.dateRange.start, this.dateRange.end);

      // Convert the response data to a map for quick lookup
      const dataMap = new Map(response.map((item: any) => [item.date, parseInt(item.sessions || '0', 10)]));

      // Ensure all dates are represented, and fill missing dates with 0 sessions
      const filledData = allDates.map(date => ({
        date,
        sessions: dataMap.get(date) || 0
      }));

      // Return the filled and sorted data
      return filledData.sort((a, b) => a.date.localeCompare(b.date));
    }
    return null;
  }
}
