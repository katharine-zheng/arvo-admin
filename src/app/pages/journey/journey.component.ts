import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-journey',
  templateUrl: './journey.component.html',
  styleUrl: './journey.component.css'
})
export class JourneyComponent implements OnInit {
  journey: any;
  journeyId: string | undefined;
  displayMode: string = '';
  videos: Array<any> = [];
  displayedVideos: Array<any> = [];
  allVideos: Array<any> = [];
  selectedVideos: any[] = [];
  filteredVideos: any[] = [];  // List of videos filtered by tag
  selectedTag: string = '';  // Tag selected by the user
  availableTags: string[] = [];
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
      name: ['', Validators.required],  // Add the name field
      type: ['prePurchase', Validators.required],
      videos: [[], Validators.required],
      tagFilter: [''] 
    });
  }

  ngOnInit(): void {
    // Get the journey or product id from the URL
    this.journeyId = this.route.snapshot.paramMap.get('id') || '';
    // Fetch existing journey data from the backend if needed
    this.fetchVideos();

    if (!this.journeyId) {
      this.setDisplayMode('all');
    }

    this.db.currentJourney.subscribe(journey => {
      if (journey) {
        this.journey = journey;
        this.journeyForm.patchValue({
          name: journey.name,
          type: journey.type,
        });
        this.journeyForm.controls['videos'].setValue(journey.videos);
        this.preselectVideos();
      } else {
        this.setDisplayMode('all');
      }
    });

    this.journeyForm.get('tagFilter')?.valueChanges.subscribe(tag => {
      this.selectedTag = tag;
      this.filterVideosByTag();  // Filter the videos when the tag changes
    });
  }

  // Method to handle the drag-and-drop event
  drop(event: CdkDragDrop<any[]>) {
    // Get the current list of videos from the form
    const videos = this.journeyForm.controls['videos'].value;

    // Use moveItemInArray to reorder the videos based on the drag event
    moveItemInArray(videos, event.previousIndex, event.currentIndex);

    // Update the form control with the new order
    this.journeyForm.controls['videos'].setValue(videos);

    // Optionally, save the reordered list to Firestore
    // this.updateJourneyVideos(videos);
    this.saveJourney();
  }

  clearFilters() {
    this.journeyForm.controls['tagFilter'].setValue('');  // Clear tag filter
    this.filteredVideos = [...this.videos];  // Reset to show all videos
    this.displayedVideos = [...this.videos];
    this.displayMode = 'all';  // Reset display mode to 'all'
    this.updateDisplayedVideos();
  }

  async fetchVideos() {
    const videos = await this.db.getVideos(this.db.account.id);
    this.videos = videos.filter(video => video.tag && video.tag.trim() !== '');
    this.allVideos = this.videos;
    this.filteredVideos = this.videos;
    this.displayedVideos = this.videos;
    this.availableTags = this.db.videoTags;

    // If journey data is already loaded and videos need to be preselected
    this.selectedVideos = this.journeyForm.controls['videos'].value;
    if (this.selectedVideos.length > 0) {
      this.setDisplayMode('selected');
      this.preselectVideos();
      const selectedVideos = this.selectedVideos;
      if (selectedVideos && selectedVideos.length > 0) {
        this.allVideos.forEach(video => {
          // Check if this video object is already part of the journey
          video.selected = selectedVideos.some((v: any) => v.id === video.id);
        });
      }
    } else {
      this.setDisplayMode('all');
    }
  }

  setDisplayMode(tab: string) {
    if (tab === 'all') {
      this.displayedVideos = this.allVideos;
    } else {
      this.displayedVideos = this.selectedVideos;
    }
  }

  // Filter videos by the selected tag
  filterVideosByTag() {
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredVideos = this.videos.filter(video => video.tag === this.selectedTag);
      this.displayedVideos = this.filteredVideos;
    } else {
      // If no tag is selected, show all videos
      this.filteredVideos = this.videos;
    }
  }

  updateDisplayedVideos() {
    if (this.displayMode === 'selected') {
      this.displayedVideos = this.selectedVideos;
    } else {
      this.displayedVideos = this.filteredVideos;
    }
  }

  preselectVideos() {
    if (this.selectedVideos && this.selectedVideos.length > 0) {
      this.allVideos.forEach(video => {
        video.selected = this.isSelected(video);
      });
    }
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
    this.allVideos.sort((a, b) => a.label.localeCompare(b.label)); // Example of sorting by label
  }

  // Handle selecting and deselecting videos
  onVideoSelected(video: any) {
    const selectedVideos = this.selectedVideos;
    const index = selectedVideos.findIndex(v => v.id === video.id);

    if (index > -1) {
      // If already selected, remove it
      this.selectedVideos.splice(index, 1);
    } else {
      // If not selected, add it
      this.selectedVideos.push(video);
    }
    this.journeyForm.controls['videos'].setValue(this.selectedVideos);
  }

  // Check if a video is selected
  isSelected(video: any): boolean {
    return this.selectedVideos.some(v => v.id === video.id);
  }

  nameExists(name: string) {
    if (this.journey.name === name) {
      return false;
    }
    const journeys = this.db.journeys;
    let exists = journeys.some((j: any) => j.name === name);
    return exists;
  }

  async saveJourney() {
    if (this.journeyForm.valid) {
      const name = this.journeyForm.value.name;
      const nameExists = this.nameExists(name);
      const journey: any = {
        name: name,
        type: this.journeyForm.value.type,
        videos: this.journeyForm.value.videos
      };

      if (nameExists) {
        console.error('name exists');
      } else if (this.journey.id) {
        this.db.updateJourney(this.journey.id, journey).then(() => {
        }).catch(error => {
          console.error('Error saving journey:', error);
        });
      } else {
        this.db.createJourney(journey).then(() => {
        }).catch(error => {
          console.error('Error saving journey:', error);
        });
      }
    }
  }

}
