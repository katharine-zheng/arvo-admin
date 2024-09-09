import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.css'
})
export class MediaComponent implements OnInit {
  public videos: any[] = [];
  public isDeleting: boolean = false;
  public selectedVideos: Array<{ id: string; url: string }> = [];
  masterToggle: boolean = false;  // State of the master toggle

  constructor(private changeRef: ChangeDetectorRef, private auth: AuthService, private db: DbService, private storage: StorageService) {}

  ngOnInit(): void {
    this.getVideos();
  }

  async getVideos() {
    const accountId = this.auth.uid;
    if (accountId) {
      this.videos = await this.db.getVideos(accountId);
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
      this.selectedVideos = []; // Deselect all
    }
  }

  toggleSelection(video: { id: string; url: string }, event: any): void {
    if (event.target.checked) {
      this.selectedVideos.push(video);
    } else {
      this.selectedVideos = this.selectedVideos.filter(v => v.id !== video.id);
    }
  }

  deleteVideo(videoId: string, videoUrl: string): void {
    this.isDeleting = true;
    this.storage.deleteVideo(videoId, videoUrl).subscribe(
      () => {
        // Remove the video from the list after deletion
        this.videos = this.videos.filter(video => video.id !== videoId);
        this.isDeleting = false;
        alert('Video deleted successfully!');
      },
      (error) => {
        console.error('Error deleting video:', error);
        this.isDeleting = false;
      }
    );
  }

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
