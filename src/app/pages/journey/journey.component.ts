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
  private journeyId: string | undefined;
  private allMedia: any[] = [];
  private filteredMedia: any[] = [];  // List of media filtered by tag

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private db: DbService) {
    this.journeyForm = this.fb.group({
      name: ['', Validators.required],  // Add the name field
      type: ['prePurchase', Validators.required],
      mediaList: [[], Validators.required],
      tagFilter: [''] 
    });
  }

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.journeyId) {
      this.setDisplayMode('all');
    }

    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.account = account;
        this.fetchMedia();
      }
    });

    this.db.currentJourney.subscribe(journey => {
      if (journey) {
        this.journey = journey;
        this.journeyForm.patchValue({
          name: journey.name,
          type: journey.type,
        });
        this.journeyForm.controls['mediaList'].setValue(journey.mediaList);
        this.preselectMedia();
      } else {
        this.setDisplayMode('all');
      }
    });

    this.journeyForm.get('tagFilter')?.valueChanges.subscribe(tag => {
      this.selectedTag = tag;
      this.filterMediaByTag();  // Filter media when the tag changes
    });
  }

  // Method to handle the drag-and-drop event
  drop(event: CdkDragDrop<any[]>) {
    const mediaList = this.journeyForm.controls['mediaList'].value;
    moveItemInArray(mediaList, event.previousIndex, event.currentIndex);
    this.journeyForm.controls['mediaList'].setValue(mediaList);
    this.saveJourney();
  }

  clearFilters() {
    this.journeyForm.controls['tagFilter'].setValue('');  // Clear tag filter
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
    this.selectedMedia = this.journeyForm.controls['mediaList'].value ?? [];
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

  // Filter media by the selected tag
  filterMediaByTag() {
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredMedia = this.allMedia.filter(media => media.tags.includes(this.selectedTag));
      this.displayedMedia = this.filteredMedia;
    } else {
      this.filteredMedia = this.allMedia;
    }
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

  // onMediaSelect(event: any, media: any) {
  //   const selectedMedia = this.journeyForm.controls['mediaList'].value as any[];
  //   if (event.target.checked) {
  //     this.journeyForm.controls['mediaList'].setValue([...selectedMedia, media]);
  //   } else {
  //     this.journeyForm.controls['mediaList'].setValue(selectedMedia.filter(v => v.id !== media.id));
  //   }
  // }

  onMediaSelected(media: any) {
    const index = this.selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
    this.journeyForm.controls['mediaList'].setValue(this.selectedMedia);
  }

  isSelected(media: any): boolean {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      return this.selectedMedia.some(v => v.id === media.id);
    }
    return false;
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
      const mediaList = this.journeyForm.value.mediaList;
      const journey: any = {
        accountId: this.account.id,
        name: name,
        type: this.journeyForm.value.type,
        mediaList: mediaList,
        mediaIds: mediaList.map((media: any) => media.id),
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
