import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.css'
})
export class MediaLibraryComponent {

  @Input() defaultView: string = "";
  @Input() showUpload: boolean = false;
  @Output() selectionChanged = new EventEmitter<any[]>(); // Emit selection change event

  public allMedia: any[] = [];
  public filteredMedia: any[] = [];
  public selectedMedia: any[] = [];
  public unassignedMedia: any[] = [];
  public tags: string[] = [];
  public view: string = "";
  public searchTerm: string = "";
  public selectedTag: string = "";
  public displayedColumns: string[] = ['select', 'image', 'name', 'tags', 'type', 'time'];
  private masterToggle: boolean = false;

  constructor(private changeRef: ChangeDetectorRef, private db: DbService) {}

  //TODO preview image function
  ngOnInit(): void {
    this.db.mediaList$.subscribe(media => {
      this.allMedia = [...media];
      this.filteredMedia = this.allMedia;
    });

    if (this.defaultView == 'grid') {
      this.view = "grid";
    } else {
      this.view = "table";
    }
  }

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
    const index = this.selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
    this.changeRef.detectChanges();
    this.selectionChanged.emit(this.selectedMedia);
  }

  toggleAll(): void {
    this.masterToggle = !this.masterToggle;
    if (this.masterToggle) {
      this.selectedMedia = this.selectedMedia.concat(this.filteredMedia);
    } else {
      this.selectedMedia = [];
    }
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
}
