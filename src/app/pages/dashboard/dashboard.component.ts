import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private account: any;

  constructor(private db: DbService) {}
  
  ngOnInit(): void {
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
      }
    });
  }
}
