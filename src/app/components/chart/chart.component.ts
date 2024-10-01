import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.css'
})
export class ChartComponent implements OnChanges {

  @Input() id!: string;
  @Input() labels: string[] = [];
  @Input() dataset: number[] = [];

  private chartInstance: Chart | undefined;

  constructor() { 
    Chart.register(...registerables);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['labels'] || changes['dataset']) {
      if (this.chartInstance) {
        this.updateChart();
      } else {
        this.initializeChart();
      }
    }
  }

  private initializeChart(): void {
    const canvas = document.getElementById(this.id) as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to acquire 2D context for the canvas');
      return;
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [{
          label: 'Sessions',
          data: this.dataset,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (this.chartInstance) {
      this.chartInstance.data.labels = this.labels;
      this.chartInstance.data.datasets[0].data = this.dataset;
      this.chartInstance.update();
    }
  }
}
