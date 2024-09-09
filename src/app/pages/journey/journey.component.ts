import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-journey',
  templateUrl: './journey.component.html',
  styleUrl: './journey.component.css'
})
export class JourneyComponent {

  journeyId: string | undefined;
  videos: Array<{ url: string; label: string }> = [];
  faqs: Array<{ question: string; answer: string }> = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get the journey or product id from the URL
    this.journeyId = this.route.snapshot.paramMap.get('id') || '';
    // Fetch existing journey data from the backend if needed
    // this.loadJourneyData(this.journeyId);
  }

  // Add a video to the journey
  addVideo(videoUrl: string, label: string) {
    this.videos.push({ url: videoUrl, label });
  }

  // Sort videos
  sortVideos() {
    this.videos.sort((a, b) => a.label.localeCompare(b.label)); // Example of sorting by label
  }

  // Add FAQ
  addFaq(question: string, answer: string) {
    this.faqs.push({ question, answer });
  }

  // Future implementation for AI chat
  // implementAIChat() {
  // }

}
