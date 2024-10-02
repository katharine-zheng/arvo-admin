import { Injectable } from '@angular/core';
import { parse, format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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
    // Assuming dateStr is in the format 'YYYYMMDD'
    const date = parse(dateStr, 'yyyyMMdd', new Date());

    // Convert to local timezone (if needed)
    const localDate = toZonedTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Format the date for display (e.g., 'Sep 29')
    return format(localDate, 'MMM dd');
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
