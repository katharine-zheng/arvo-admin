import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { TagFormComponent } from '../../modals/tag-form/tag-form.component';
import { DeleteDialogComponent } from '../../modals/delete-dialog/delete-dialog.component';
import { MediaUploadComponent } from '../../components/media-upload/media-upload.component';
import { catchError, combineLatestAll, finalize, forkJoin, from, of, tap } from 'rxjs';

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
  public selectedMedia: any[] = [];
  public uploadingMedia: any[] = [];
  public unassignedMedia: any[] = [];
  public products: any[] = [];
  public journeys: any[] = [];
  public tags: string[] = [];
  public view: 'grid' | 'table' = 'table';
  public displayedColumns: string[] = ['select', 'image', 'name', 'tags', 'type'];
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

        //TODO UNCOMMENT
        // this.fetchJourneys();
        // this.fetchProducts();
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

  getMediaType(media: any) {
    if (media.type) {
      if (media.type.includes("video")) {
        return "Video";
      } else if (media.type.includes("image")) {
        return "Image";
      }
    }
    return "";
  }

  filterWithoutTags(): void {
    this.filteredMedia = this.allMedia.filter(media => !media.tags || media.tags.length === 0);
  }

  filterBySearchTerm() {
    if (this.searchTerm) {
      this.filteredMedia = this.allMedia.filter(media =>
        media.originalName.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredMedia = [...this.allMedia];
    }
  }

  filterByTag(tag: string) {
    this.selectedTag = tag;
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredMedia = this.allMedia.filter(media => media.tags.includes(this.selectedTag));
    } else {
      this.filteredMedia = this.allMedia;
    }
  }

  filterByType(type: string) {
    if (type) {
      this.filteredMedia = this.allMedia.filter(media => media.type.includes(type));
    } else {
      this.filteredMedia = this.allMedia;
    }
  }

  clearSearch() {
    this.searchTerm = "";
    this.filteredMedia = [...this.allMedia];
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
      const media = await this.db.getMedia(accountId);
      media.forEach(item => {
        if (item.url && !item.thumbnailUrl) {
          item.thumbnailUrl = item.url;
        }
      });
      this.allMedia = media;
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

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        this.updateTags(result);
      }
    });
  }

  async updateTags(tags: any[]): Promise<void> {
    this.isLoading = true;
    try {
      await this.db.updateAccountTags(tags);
      this.tags = tags;
    } catch (error) {
      console.error('Error assigning category:', error);
    }
    this.isLoading = false;
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

  openUploadModal() {
    this.selectedMedia = [];
    this.filteredMedia = this.allMedia;
    const dialogRef = this.dialog.open(MediaUploadComponent, {
      width: '600px',
      data: { 
        tags: this.tags,
        journeys: this.journeys,
        products: this.products,
      },
      hasBackdrop: true,
      disableClose: false, 
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result && result.media) {
        this.uploadingMedia = result.media;
        this.uploadMedia(result.tags, result.products, result.journeys);
      }
    });
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

  async deleteSelectedMedia(): Promise<void> {
    if (this.selectedMedia.length === 0) return;
  
    this.isDeleting = true;
    this.isLoading = true;
  
    // Create an array of delete promises
    const deletePromises = this.selectedMedia.map(async media => {
      const folder = this.getStorageFolder(media);
      try {
        await this.storage.deleteMedia(media, folder);
        this.allMedia = this.allMedia.filter(v => v.id !== media.id);
      } catch (error) {
        console.error('Error deleting media:', error);
        throw error;
      }
    });
  
    // Wait for all delete operations to complete
    try {
      await Promise.all(deletePromises);
      this.selectedMedia = [];
      this.filteredMedia = this.allMedia;
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      this.isDeleting = false;
      this.isLoading = false;
      this.changeRef.detectChanges();
    }
  }

  uploadMedia(tags: string[] = [], products: any[] = [], journeys: any[] = []) {
    const newMedia: any[] = [];
    const uploadObservables: any[] = [];
    this.uploadingMedia.forEach((media, index) => {
      const folder = this.getStorageFolder(media.file);
      const upload$ = this.storage.uploadMedia(media.file, folder, tags, products, journeys)
        .pipe(
          tap(async (event) => {
            if (this.uploadingMedia[index]) {
              this.uploadingMedia[index].uploadProgress = event.progress; // Update progress

              if (event.downloadURL) {
                this.uploadingMedia[index].downloadURL = event.downloadURL;
                newMedia.push(event.media);
              }
            }
          }),
          catchError((error) => {
            console.error('Error uploading file:', error);
            return of(null); // Handle the error and return a fallback observable
          })
        );

      uploadObservables.push(upload$); // Add each upload observable to the array
    });

    // Use combineLatestAll() to wait for all uploads to complete
    from(uploadObservables).pipe(
      combineLatestAll(), // Wait for all observables to complete
      finalize(() => {
        // This block runs once all uploads are complete (success or error)
        if (this.uploadingMedia.every(v => v.uploadProgress === 100)) {
          this.allMedia.forEach(item => {
            if (item.url && !item.thumbnailUrl) {
              item.thumbnailUrl = item.url;
            }
          });
          this.uploadingMedia = [];
          this.filteredMedia = [...this.allMedia];
          this.changeRef.detectChanges();
        }
      })
    ).subscribe(); 
  }

  getStorageFolder(mediaFile: any) {
    let folder = "";
    if (mediaFile.type.includes("video")) {
      folder = "videos";
    } else if (mediaFile.type.includes("image")) {
      folder = "images";
    }
    return folder;
  }
}
