import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { TagFormComponent } from '../../modals/tag-form/tag-form.component';
import { UploadModalComponent } from '../../modals/upload-modal/upload-modal.component';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.css'
})
export class MediaComponent implements OnInit {
  public allMedia: any[] = [];
  public filteredMedia: any[] = [];
  public isDeleting: boolean = false;
  public selectedMedia: Array<any> = [];
  public unassignedMedia: any[] = [];
  public products: any[] = [];
  public journeys: any[] = [];
  public tags: string[] = [];
  public selectedProductId: string = "";
  public selectedTag: string = "";
  public searchTerm: string = "";
  public productId: string | undefined;
  private masterToggle: boolean = false;  // State of the master toggle
  constructor(private changeRef: ChangeDetectorRef, private auth: AuthService, private db: DbService, private storage: StorageService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadTags();
    this.getMedia();
    this.fetchJourneys();
    this.fetchProducts();
  }

  async fetchJourneys() {
    this.journeys = await this.db.getJourneys();
  }

  async fetchProducts() {
    this.products = await this.db.getProducts();
  }

  filterMediaWithoutTags(): void {
    this.filteredMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
  }

  filterMedia() {
    if (this.searchTerm) {
      this.filteredMedia = this.allMedia.filter(media =>
        media.originalName.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredMedia = [...this.allMedia];
    }
  }

  clearSearch() {
    this.searchTerm = "";
    this.filteredMedia = [...this.allMedia];
  }

  filterMediaByTag(tag: string) {
    this.selectedTag = tag;
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredMedia = this.allMedia.filter(media => media.tags.includes(this.selectedTag));
    } else {
      this.filteredMedia = this.allMedia;
    }
  }

  async loadTags() {
    try {
      this.tags = this.db.mediaTags;
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }

  async getMedia() {
    const accountId = this.auth.uid;
    if (accountId) {
      this.allMedia = await this.db.getMedia(accountId);
      this.filteredMedia = this.allMedia;
      this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
    }
  }

  openTagModal() {
    const dialogRef = this.dialog.open(TagFormComponent, {
      width: '300px',
      data: { tags: this.tags }
    });

    // After the modal is closed, retrieve the new tag and add it to the list
    dialogRef.afterClosed().subscribe(async (newTag: string) => {
      if (newTag) {
        await this.saveTag(newTag);
      }
      this.tags = this.db.mediaTags;
    });
  }

  async addTagToMedia(tag: string) {
    if (tag) {
      this.selectedTag = tag;
      try {
        this.selectedMedia.forEach(async (media) => {
          await this.db.addTagToMedia(tag, media);
          if (!media.tags.includes(tag)) {
            media.tags.push(tag);
          }
        });
        this.selectedTag = "";
        this.selectedMedia = [];
        this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
        this.changeRef.detectChanges();
      } catch (error) {
        console.error('Error assigning tag:', error);
      }
    } else {
      alert('Please select or enter a tag.');
    }
  }

  removeTagFromMedia(tag: string) {
    if (tag && this.selectedMedia.length === 1) {
      this.selectedTag = tag;
      try {
        this.selectedMedia.forEach(async (media) => {
          await this.db.removeTagFromMedia(tag, media);
          media.tags = media.tags.filter((t: string) => t !== tag);
        });
        this.selectedTag = "";
        this.selectedMedia = [];
        this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
        this.changeRef.detectChanges();
      } catch (error) {
        console.error('Error assigning tag:', error);
      }
    } else {
      alert('Please select or enter a tag.');
    }
  }

  async saveTag(newTag: string): Promise<void> {
    if (!this.tags.includes(newTag)) {
      try {
        await this.db.addTagToAccount(newTag);
        this.tags.push(newTag);
      } catch (error) {
        console.error('Error assigning category:', error);
      }
    } else {
      alert('Tag already exists');
    }
  }

  openUploadModal() {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '600px',
      data: null,
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        this.concatMedia(result);
      }
    });
  }

  concatMedia(medias: any[]) {
    this.allMedia = this.allMedia.concat(medias);
    this.filteredMedia = this.allMedia;
    this.changeRef.detectChanges();
  }

  // Toggle all checkboxes (select or deselect all)
  toggleAll(): void {
    this.masterToggle = !this.masterToggle;
    if (this.masterToggle) {
      this.selectedMedia = this.selectedMedia.concat(this.filterMedia); // Select all
    } else {
      this.selectedMedia = [];
    }
  }

  // toggleSelection(media: any, event: any): void {
  //   if (event.target.checked) {
  //     this.selectedMedia.push(media);
  //   } else {
  //     this.selectedMedia = this.selectedMedia.filter(v => v.id !== media.id);
  //   }
  // }

  onMediaSelected(media: any) {
    const selectedMedia = this.selectedMedia;
    const index = selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
  }

  isSelected(media: any): boolean {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      return this.selectedMedia.some(v => v.id === media.id);
    }
    return false;
  }

  // Add selected media to the journey document
  async addMediaToProduct() {
    if (!this.selectedProductId) {
      console.error("No journey selected");
      return;
    }
  
    if (this.selectedMedia.length === 0) {
      console.error("No media selected");
      return;
    }

    this.selectedMedia = this.selectedMedia.filter(media => media.tags && media.tags.length > 0);
    await this.db.addMediaToProduct(this.selectedProductId, this.selectedMedia);
  }

  deleteMedia(media: any): void {
    const mediaId = media.id;
    const mediaUrl = media.url;
    media.isDeleting = true;
    this.storage.deleteMedia(mediaId, mediaUrl).subscribe(
      () => {
        this.allMedia = this.allMedia.filter(media => media.id !== mediaId);
        this.filteredMedia = this.filteredMedia.filter(media => media.id !== mediaId);
        this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
        this.changeRef.detectChanges();
        media.isDeleting = false;
      },
      (error) => {
        console.error('Error deleting media:', error);
        this.isDeleting = false;
      }
    );
  }

  // deleteMedia(mediaId: string, mediaUrl: string): void {
  //   this.isDeleting = true;
  //   this.storage.deleteMedia(mediaId, mediaUrl).subscribe(
  //     () => {
  //       // Remove the media from the list after deletion
  //       this.allMedia = this.allMedia.filter(media => media.id !== mediaId);
  //       this.isDeleting = false;
  //       alert('Media deleted successfully!');
  //     },
  //     (error) => {
  //       console.error('Error deleting media:', error);
  //       this.isDeleting = false;
  //     }
  //   );
  // }

  // Method to bulk delete media
  deleteSelectedMedia(): void {
    if (this.selectedMedia.length === 0) return;
    this.isDeleting = true;

    // Iterate over each selected media and delete it
    this.selectedMedia.forEach((media) => {
      this.storage.deleteMedia(media.id, media.url).subscribe(
        () => {
          // Remove the deleted media from the media list
          this.allMedia = this.allMedia.filter(v => v.id !== media.id);
          // After deleting all, reset the selectedMedia array
          if (this.selectedMedia.length === 1) {
            this.selectedMedia = [];
            this.isDeleting = false;
            this.filteredMedia = this.allMedia;
            alert('Selected media deleted successfully!');
          }
        },
        (error) => {
          console.error('Error deleting media:', error);
          this.isDeleting = false;
        }
      );
    });
  }
}
