import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-journey',
  templateUrl: './journey.component.html',
  styleUrl: './journey.component.css'
})
export class JourneyComponent implements OnInit {

  productId: string | undefined;
  journeyId: string | undefined;
  videos: Array<any> = [];
  faqs: Array<{ question: string; answer: string }> = [];
  journeyForm: FormGroup;
  journeyTypes = [
    { label: 'Pre-Purchase', value: 'prePurchase' },
    { label: 'Post-Purchase', value: 'postPurchase' }
  ];

  constructor(private route: ActivatedRoute,
    private fb: FormBuilder,
    private db: DbService  // Fetch videos for selection
  ) {
    this.journeyForm = this.fb.group({
      type: ['prePurchase', Validators.required],
      videos: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    // Get the journey or product id from the URL
    this.productId = this.route.snapshot.paramMap.get('pId') || '';
    // Fetch existing journey data from the backend if needed
    this.fetchVideos();
  }

  async fetchVideos() {
    this.videos = await this.db.getVideos(this.db.account.id);
  }

  onVideoSelect(event: any, video: any) {
    const selectedVideos = this.journeyForm.controls['videos'].value as any[];
  
    if (event.target.checked) {
      // Add the whole video object to the array
      this.journeyForm.controls['videos'].setValue([...selectedVideos, video]);
    } else {
      // Remove the video object from the array based on its ID
      this.journeyForm.controls['videos'].setValue(selectedVideos.filter(v => v.id !== video.id));
    }
  }

  // Sort videos
  sortVideos() {
    this.videos.sort((a, b) => a.label.localeCompare(b.label)); // Example of sorting by label
  }

  async saveJourney() {
    if (this.productId && this.journeyForm.valid) {
      const journey: any = {
        type: this.journeyForm.value.type,
        videos: this.journeyForm.value.videos
      };

      this.db.addJourney(this.productId, journey).then(() => {
        alert('Journey saved successfully!');
      }).catch(error => {
        console.error('Error saving journey:', error);
      });
    }
  }

}
