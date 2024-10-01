import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateUtilsService {

  constructor() { }

  // Helper function to format Date objects to YYYY-MM-DD format
  formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');  // Ensure 2 digits
    const day = date.getDate().toString().padStart(2, '0');  // Ensure 2 digits
    return `${year}-${month}-${day}`;
  }

  // Helper method to format date to YYYYMMDD format (for Google Analytics)
  formatDateForGA(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  formatDateForDisplay(dateStr: string): string {
    // Extract year, month, and day from the YYYYMMDD string
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
  
    // Create a Date object from the extracted parts
    const date = new Date(`${year}-${month}-${day}`);
  
    // Format the date into a human-readable format (e.g., "Sep 17")
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Generate all dates between startDate and endDate (in YYYYMMDD format)
  getAllDatesInRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(this.formatDateForGA(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
