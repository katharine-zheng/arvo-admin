import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  public journey: any;
  public displayMode: string = "";
  public displayedMedia: any[] = [];
  public selectedMedia: any[] = [];
  public selectedTag: string = "";
  public availableTags: string[] = [];
  public journeyForm: FormGroup;
  public journeyTypes = [
    { label: 'Pre-Purchase', value: 'prePurchase' },
    { label: 'Post-Purchase', value: 'postPurchase' }
  ];
  
  private account: any;
  private product: any;
  private journeyId: string | undefined;
  private allMedia: any[] = [];
  private filteredMedia: any[] = [];  // List of media filtered by tag

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private changeRef: ChangeDetectorRef, private db: DbService) {
    this.journeyForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      videos: [[]],
      images: [[]],
      tagFilter: [''] 
    });
  }

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id') || '';

    if (this.journeyId) {
      this.getJourney();
    } else {
      this.setDisplayMode('all');
    }

    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
        this.fetchMedia();
      }
    });

    this.db.currentProduct.subscribe(product => {
      if (product) {
        this.product = product;
        if (!this.product.journeys || this.product.journeys.length < 1) {
          this.journeyForm.controls['name'].setValue(`${this.product.name} Post Purchase`);
          this.journeyForm.controls['type'].setValue('postPurchase');
        }
        this.preselectMedia();
      } else {
        this.setDisplayMode('all');
      }
    });

    this.db.currentJourney.subscribe(journey => {
      if (journey) {
        this.journey = journey;
        this.journeyForm.patchValue({
          name: journey.name,
          type: journey.type,
        });
        this.journeyForm.controls['videos'].setValue(journey.videos);
        this.preselectMedia();
      } else {
        this.setDisplayMode('all');
      }
    });

    this.journeyForm.get('tagFilter')?.valueChanges.subscribe(tag => {
      this.filterMediaByTag(tag);
    });
  }

  async getJourney() {
    try {
      this.journey = await this.db.getJourney(this.journeyId!);
    } catch (error) {
      console.error(error);
    }
  }

  // Method to handle the drag-and-drop event
  drop(event: CdkDragDrop<any[]>) {
    const videos = this.journeyForm.controls['videos'].value;
    moveItemInArray(videos, event.previousIndex, event.currentIndex);
    this.journeyForm.controls['videos'].setValue(videos);
    this.saveJourney();
  }

  clearFilters() {
    // this.journeyForm.controls['tagFilter'].setValue('');  // Clear tag filter
    this.filteredMedia = [...this.allMedia];  // Reset to show all media
    this.displayedMedia = [...this.allMedia];
    this.displayMode = 'all';  // Reset display mode to 'all'
    this.updatedisplayedMedia();
  }

  async fetchMedia() {
    this.allMedia = await this.db.getMedia(this.account.id);
    this.filteredMedia = this.allMedia;
    this.displayedMedia = this.allMedia;
    this.availableTags = this.db.mediaTags;

    // If journey data is already loaded and media need to be preselected
    this.selectedMedia = this.journeyForm.controls['videos'].value ?? [];
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      this.setDisplayMode('selected');
      this.preselectMedia();
      const selectedMedia = this.selectedMedia;
      if (selectedMedia && selectedMedia.length > 0) {
        this.allMedia.forEach(media => {
          // Check if this media object is already part of the journey
          media.selected = selectedMedia.some((v: any) => v.id === media.id);
        });
      }
    } else {
      this.setDisplayMode('all');
    }
  }

  setDisplayMode(tab: string) {
    if (tab === 'all') {
      this.displayedMedia = this.allMedia;
    } else {
      this.displayedMedia = this.selectedMedia;
    }
  }

  filterMediaByTag(tag: string) {
    this.selectedTag = tag;
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredMedia = this.allMedia.filter(media => media.tags.includes(this.selectedTag));
      this.displayedMedia = this.filteredMedia;
    } else {
      // If no tag is selected, show all media
      this.filteredMedia = this.allMedia;
      this.displayedMedia = this.filteredMedia;
    }
    this.changeRef.detectChanges();
  }

  updatedisplayedMedia() {
    if (this.displayMode === 'selected') {
      this.displayedMedia = this.selectedMedia;
    } else {
      this.displayedMedia = this.filteredMedia;
    }
  }

  preselectMedia() {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      this.allMedia.forEach(media => {
        media.selected = this.isSelected(media);
      });
    }
  }

  onMediaSelect(event: any, media: any) {
    const selectedMedia = this.journeyForm.controls['videos'].value as any[];
    if (event.target.checked) {
      this.journeyForm.controls['videos'].setValue([...selectedMedia, media]);
    } else {
      this.journeyForm.controls['videos'].setValue(selectedMedia.filter(v => v.id !== media.id));
    }
  }

  onMediaSelected(media: any) {
    const index = this.selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
    this.journeyForm.controls['videos'].setValue(this.selectedMedia);
  }

  isSelected(media: any): boolean {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      return this.selectedMedia.some(v => v.id === media.id);
    }
    return false;
  }

  // note currently not used due to the limit of one journey
  // nameExists(name: string) {
  //   if (this.journey.name === name) {
  //     return false;
  //   }
  //   const journeys = this.db.journeys;
  //   let exists = journeys.some((j: any) => j.name === name);
  //   return exists;
  // }

  async saveJourney() {
    if (this.journeyForm.valid) {
      const name = this.journeyForm.value.name;
      // const nameExists = this.nameExists(name);
      const videos = this.journeyForm.value.videos;
      const journey: any = {
        accountId: this.account.id,
        productId: this.product.id,
        name: name,
        type: this.journeyForm.value.type,
        videos: videos,
        videoIds: videos.map((media: any) => media.id),
      };

      if (this.journey && this.journey.id) {
        await this.updateJourney(journey);
      } else {
        await this.createJourney(journey);
      }
    }
  }

  async createJourney(journey: any) {
    try {
      await this.db.createJourney(journey);
    } catch (error) {
      console.error('Error saving journey:', error);
    }
  }

  async updateJourney(journey: any) {
    try {
      await this.db.updateJourney(this.journey.id, journey);
    } catch (error) {
      console.error('Error saving journey:', error);
    }
  }

}
