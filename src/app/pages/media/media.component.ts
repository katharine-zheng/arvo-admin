import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { TagFormComponent } from '../../modals/tag-form/tag-form.component';
import { UploadModalComponent } from '../../modals/upload-modal/upload-modal.component';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.css'
})
export class MediaComponent implements OnInit {
  public allMedia: any[] = [];
  public filteredMedia: any[] = [];
  public isLoading: boolean = false;
  public isDeleting: boolean = false;
  public selectedMedia: Array<any> = [];
  public unassignedMedia: any[] = [];
  public products: any[] = [];
  public journeys: any[] = [];
  public tags: string[] = [];
  public view: 'grid' | 'table' = 'table';
  public displayedColumns: string[] = ['select', 'image', 'name', 'tags'];
  public selectedProductId: string = "";
  public selectedTag: string = "";
  public searchTerm: string = "";
  public productId: string | undefined;
  private masterToggle: boolean = false;

  constructor(private changeRef: ChangeDetectorRef, private auth: AuthService, private db: DbService, private storage: StorageService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.db.currentAccount.subscribe((account: any) => {
      if (account) {
        this.loadTags();
        this.getMedia();
        this.fetchJourneys();
        this.fetchProducts();
      }
    });
  }

  async fetchJourneys() {
    this.journeys = await this.db.getJourneys();
  }

  async fetchProducts() {
    this.products = await this.db.getProducts();
  }

  setView(view: 'grid' | 'table') {
    this.view = view;
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
    this.isLoading = true;
    const accountId = this.auth.uid;
    if (accountId) {
      this.allMedia = await this.db.getMedia(accountId);
      this.filteredMedia = this.allMedia;
      this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
    }
    this.isLoading = false;
    this.changeRef.detectChanges();
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
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      if (tag) {
        this.selectedTag = tag;
        this.isLoading = true;
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
        this.isLoading = false;
        this.changeRef.detectChanges();
      } else {
        alert('Please select or enter a tag.');
      }
    }
  }

  removeTagFromMedia(tag: string) {
    if (tag && this.selectedMedia.length === 1) {
      this.selectedTag = tag;
      this.isLoading = true;
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
      this.isLoading = false;
      this.changeRef.detectChanges();
    } else {
      alert('Please select or enter a tag.');
    }
  }

  async saveTag(newTag: string): Promise<void> {
    if (!this.tags.includes(newTag)) {
      this.isLoading = true;
      try {
        await this.db.addTagToAccount(newTag);
        this.tags.push(newTag);
      } catch (error) {
        console.error('Error assigning category:', error);
      }
      this.isLoading = false;
    } else {
      alert('Tag already exists');
    }
  }

  openUploadModal() {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '600px',
      data: null,
      hasBackdrop: true,
      disableClose: true, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        // this.concatMedia(result);
        this.getMedia();
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
      this.selectedMedia = this.selectedMedia.concat(this.filteredMedia);
    } else {
      this.selectedMedia = [];
    }
  }

  // toggleSelection(media: any, event: any): void {
  //   if (event.target.checked) {
  //     // Check if the media already exists in the array
  //     const mediaExists = this.selectedMedia.some(v => v.id === media.id);
      
  //     if (!mediaExists) {
  //       this.selectedMedia.push(media);
  //     }
  //   } else {
  //     this.selectedMedia = this.selectedMedia.filter(v => v.id !== media.id);
  //   }
  // }

  trackByMedia(index: number, media: any): any {
    return media.id;
  }

  isSelected(media: any): boolean {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      return this.selectedMedia.some(v => v.id === media.id);
    }
    return false;
  }

  onMediaSelected(media: any) {
    const selectedMedia = this.selectedMedia;
    const index = selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
    this.changeRef.detectChanges();
  }

  async addMediaToProduct() {
    if (!this.selectedProductId) {
      console.error("No product selected");
      return;
    }
  
    if (this.selectedMedia.length === 0) {
      console.error("No media selected");
      return;
    }

    this.isLoading = true;
    // this.selectedMedia = this.selectedMedia.filter(media => media.tags && media.tags.length > 0);
    await this.db.addMediaToProduct(this.selectedProductId, this.selectedMedia);
    this.isLoading = false;
  }

  openDeleteModal(media?: any) {
    let data;
    if (media) {
      data = { 
        media,
        name: media.name,
      };
    } else {
      data = { 
        list: this.selectedMedia,
        name: `the selected ${this.selectedMedia.length} video(s)`,
      }
    }

    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '400px',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteSelectedMedia();
      }
    });
  }

  // async deleteMedia(media: any): Promise<void> {
  //   const mediaId = media.id;
  //   media.isDeleting = true;
  //   try {
  //     await this.storage.deleteMedia(media);
  //     this.allMedia = this.allMedia.filter(media => media.id !== mediaId);
  //     this.filteredMedia = this.filteredMedia.filter(media => media.id !== mediaId);
  //     this.unassignedMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
  //     this.changeRef.detectChanges();
  //     media.isDeleting = false;
  //   } catch (error) {
  //     console.error(error);
  //     this.isDeleting = false;
  //   }
  // }

  // Method to bulk delete media
  deleteSelectedMedia(): void {
    if (this.selectedMedia.length === 0) return;
    this.isDeleting = true;
    this.isLoading = true;

    // Iterate over each selected media and delete it
    this.selectedMedia.forEach(async (media, index) => {
      try {
        await this.storage.deleteMedia(media);
        this.allMedia = this.allMedia.filter(v => v.id !== media.id);
        if (index === this.selectedMedia.length - 1) {
          this.selectedMedia = [];
          this.isDeleting = false;
          this.filteredMedia = this.allMedia;
        }
      } catch (error) {
        console.error(error);
        this.isDeleting = false;
      }
      this.isLoading = false;
    });
  }
}
