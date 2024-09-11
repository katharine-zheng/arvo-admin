import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { TagFormComponent } from '../../modals/tag-form/tag-form.component';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.css'
})
export class MediaComponent implements OnInit {
  public videos: any[] = [];
  public filteredVideos: any[] = [];
  public isDeleting: boolean = false;
  public selectedVideos: Array<any> = [];
  public unassignedVideos: any[] = [];
  masterToggle: boolean = false;  // State of the master toggle

  public journeys: any[] = [];
  public tags: string[] = [];
  public selectedJourneyId: string = "";
  public selectedTag: string = "";
  public searchTerm: string = '';  // Search input value
  constructor(private changeRef: ChangeDetectorRef, private auth: AuthService, private db: DbService, private storage: StorageService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadTags();
    this.getVideos();
    this.fetchJourneys();
  }

  async fetchJourneys() {
    this.journeys = await this.db.getJourneys();
  }

  filterVideosWithoutTag(): void {
    this.filteredVideos = this.videos.filter(video => !video.tag || video.tag.trim() === '');
  }

  filterVideos() {
    if (this.searchTerm) {
      this.filteredVideos = this.videos.filter(video =>
        video.originalName.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      // If there's no search term, show all videos
      this.filteredVideos = [...this.videos];
    }
  }

  filterVideosByTag(tag: string) {
    this.selectedTag = tag;
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredVideos = this.videos.filter(video => video.tag === this.selectedTag);
    } else {
      // If no tag is selected, show all videos
      this.filteredVideos = this.videos;
    }
  }

  async loadTags() {
    try {
      this.tags = this.db.videoTags;
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }

  async addTag(tag: string) {
    await this.db.addTagToAccount(tag);
  }

  async assignTag(tag: string) {
    if (tag) {
      this.selectedTag = tag
      try {
        this.selectedVideos.forEach(async (video) => {
          video.tag = tag;
          video.tags.push(tag);
          await this.db.addTagToVideo(tag, video.id);
        });
        this.selectedVideos = [];
        this.unassignedVideos = this.videos.filter(video => !video.tag || video.tag.trim() === '');
        this.changeRef.detectChanges();
      } catch (error) {
        console.error('Error assigning tag:', error);
      }
    } else {
      alert('Please select or enter a tag.');
    }
  }

  async getVideos() {
    const accountId = this.auth.uid;
    if (accountId) {
      this.videos = await this.db.getVideos(accountId);
      this.filteredVideos = this.videos;
      this.unassignedVideos = this.videos.filter(video => !video.tag || video.tag.trim() === '');
    }
  }

  openTagModal() {
    const dialogRef = this.dialog.open(TagFormComponent, {
      width: '300px',
      data: { tags: this.tags }
    });

    // After the modal is closed, retrieve the new tag and add it to the list
    dialogRef.afterClosed().subscribe((newTag: string) => {
      if (newTag) {
        this.addNewTag(newTag);
      }
      this.tags = this.db.videoTags;
    });
  }

  // Add a new tag to the list and assign it to the video
  async addNewTag(newTag: string): Promise<void> {
    try {
      if (!this.tags.includes(newTag)) {
        await this.db.addTagToAccount(newTag);
        this.tags.push(newTag); // Add the new tag to the local array
      } else {
        alert('Tag already exists');
      }
    } catch (error) {
      console.error('Error assigning category:', error);
    }
  }

  updateVideos(videos: any[]) {
    // this.videos.push(video);
    this.videos = this.videos.concat(videos);
    this.changeRef.detectChanges();
  }

  // Toggle all checkboxes (select or deselect all)
  toggleAll(): void {
    this.masterToggle = !this.masterToggle;
    if (this.masterToggle) {
      this.selectedVideos = this.selectedVideos.concat(this.videos); // Select all
    } else {
      this.selectedVideos = [];
    }
  }

  toggleSelection(video: any, event: any): void {
    if (event.target.checked) {
      this.selectedVideos.push(video);
    } else {
      this.selectedVideos = this.selectedVideos.filter(v => v.id !== video.id);
    }
  }

  // Add selected videos to the journey document
  async addSelectedVideosToJourney() {
    if (!this.selectedJourneyId) {
      console.error("No journey selected");
      return;
    }
  
    if (this.selectedVideos.length === 0) {
      console.error("No videos selected");
      return;
    }

    await this.db.addVideosToProduct(this.selectedJourneyId, this.selectedVideos);
  }

  deleteVideo(video: any): void {
    const videoId = video.id;
    const videoUrl = video.url;
    video.isDeleting = true;
    this.storage.deleteVideo(videoId, videoUrl).subscribe(
      () => {
        // Remove the video from the list after deletion
        this.videos = this.videos.filter(video => video.id !== videoId);
        this.unassignedVideos = this.videos.filter(video => !video.tag || video.tag.trim() === '');
        this.changeRef.detectChanges();
        video.isDeleting = false;
      },
      (error) => {
        console.error('Error deleting video:', error);
        this.isDeleting = false;
      }
    );
  }

  // deleteVideo(videoId: string, videoUrl: string): void {
  //   this.isDeleting = true;
  //   this.storage.deleteVideo(videoId, videoUrl).subscribe(
  //     () => {
  //       // Remove the video from the list after deletion
  //       this.videos = this.videos.filter(video => video.id !== videoId);
  //       this.isDeleting = false;
  //       alert('Video deleted successfully!');
  //     },
  //     (error) => {
  //       console.error('Error deleting video:', error);
  //       this.isDeleting = false;
  //     }
  //   );
  // }

  // Method to bulk delete videos
  deleteSelectedVideos(): void {
    if (this.selectedVideos.length === 0) return;
    this.isDeleting = true;

    // Iterate over each selected video and delete it
    this.selectedVideos.forEach((video) => {
      this.storage.deleteVideo(video.id, video.url).subscribe(
        () => {
          // Remove the deleted video from the videos list
          this.videos = this.videos.filter(v => v.id !== video.id);
          // After deleting all, reset the selectedVideos array
          if (this.selectedVideos.length === 1) {
            this.selectedVideos = [];
            this.isDeleting = false;
            alert('Selected videos deleted successfully!');
          }
        },
        (error) => {
          console.error('Error deleting video:', error);
          this.isDeleting = false;
        }
      );
    });
  }
}
