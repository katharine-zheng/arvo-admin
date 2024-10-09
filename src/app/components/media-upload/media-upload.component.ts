import { ChangeDetectorRef, Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { DbService } from '../../services/db.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-media-upload',
  templateUrl: './media-upload.component.html',
  styleUrl: './media-upload.component.css'
})
export class MediaUploadComponent implements OnInit {

  public selectedFile: File | null = null;
  public selectedFiles: File[] = [];
  public uploadingMedia: any[] = [];
  public uploadProgress: number = 0;
  public downloadURL: string | null = null;
  public isUploading: boolean = false;
  public isDragging: boolean = false;
  public tags: string[] = [];
  public journeys: any[] = [];
  public products: any[] = [];

  // note selected journey and product not implemented yet
  public selectedJourney: any;
  public selectedProduct: any;
  public selectedTag: string = "";
  public uploadMessage: string = "";

  @Output() onMediaUploaded: EventEmitter<any> = new EventEmitter<any>();

  constructor(public dialogRef: MatDialogRef<MediaUploadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.isUploading = false;
    this.tags = this.data.tags;
    this.journeys = this.data.journeys;
    this.products = this.data.products;
  }

  selectTag(tag: string) {
    if (this.selectedTag === tag) {
      this.selectedTag = "";      
    } else {
      this.selectedTag = tag;
    }
  }

  // Handle drag-over event
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  // Handle drag-leave event
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  // Handle drop event
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  addFiles(files: File[]): void {
    this.selectedFiles = this.selectedFiles.concat(files);
    this.uploadingMedia = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));
    this.uploadFiles();
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onFilesSelected(event: any, autoUpload: boolean): void {
    this.selectedFiles = Array.from(event.target.files);
    this.uploadingMedia = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));

    if (autoUpload) {
      this.uploadFiles();
    }
  }

  uploadFiles(): void {
    if (this.uploadingMedia && this.uploadingMedia.length > 0) {
      this.done(this.uploadingMedia);
    }
  }

  close() {
    this.dialogRef.close();
  }
  
  done(media: any) {
    this.dialogRef.close({
      media,
      tags: this.selectedTag ? [this.selectedTag] : [],
      products: this.selectedProduct ? [this.selectedProduct] : [],
      journeys: this.selectedJourney ? [this.selectedJourney] : [],
    });
  }

  // single file upload
  // async uploadFile(): Promise<void> {
  //   if (this.selectedFile && this.auth.uid) {
  //     this.isUploading = true;
  //     const thumbnailUrl = await this.captureVideoThumbnail(this.selectedFile);
  //     this.storage.uploadMedia(this.selectedFile, "videos", thumbnailUrl).subscribe(
  //       (event) => {
  //         this.uploadProgress = event.progress;
  //         if (event.downloadURL) {
  //           this.downloadURL = event.downloadURL;
  //           this.isUploading = false;
  //           this.selectedFile = null;
  //           this.onMediaUploaded.emit([event.media]);
  //         }
  //         this.changeRef.detectChanges();
  //       },
  //       (error) => {
  //         console.error('Error uploading file:', error);
  //       }
  //     );
  //   }
  // }
}
