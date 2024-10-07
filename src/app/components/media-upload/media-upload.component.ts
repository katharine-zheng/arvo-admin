import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-media-upload',
  templateUrl: './media-upload.component.html',
  styleUrl: './media-upload.component.css'
})
export class MediaUploadComponent {

  public selectedFile: File | null = null;
  public selectedFiles: File[] = [];
  public uploadingMedia: any[] = [];
  public uploadProgress: number = 0;
  public downloadURL: string | null = null;
  public isUploading: boolean = false;
  public isDragging: boolean = false;

  @Input() view: string = ""; 
  @Output() onMediaUploaded: EventEmitter<any> = new EventEmitter<any>();

  constructor(private changeRef: ChangeDetectorRef, private storage: StorageService, private auth: AuthService) {}

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
    const newMedia: any[] = [];
    if (this.uploadingMedia && this.auth.uid) {
      this.isUploading = true;
      this.uploadingMedia.forEach(async (media, index) => {
        // TODO handle audio
        let folder = "";
        if (media.file.type.includes("video")) {
          folder = "videos";
        } else if (media.file.type.includes("image")) {
          folder = "images";
        }
        this.storage.uploadMedia(media.file, folder, this.auth.uid!).subscribe(
        async (event) => {
          if (this.uploadingMedia[index]) {
            this.uploadingMedia[index].uploadProgress = event.progress; // Update the progress
            if (event.downloadURL) {
              this.uploadingMedia[index].downloadURL = event.downloadURL; // Update the progress
              newMedia.push(event.media);
              // Capture the thumbnail after media upload is complete
              // Upload the thumbnail
              // await this.storage.uploadThumbnail(thumbnailUrl, media.file.name, event.id);
            }
            this.changeRef.detectChanges();
          }
        }, (error) => {
          console.error('Error uploading file:', error);
          this.isUploading = false;
        }, () => {
          if (this.uploadingMedia.every(v => v.uploadProgress === 100)) {
            this.isUploading = false;
            this.uploadingMedia = [];
            this.selectedFiles = [];
            this.onMediaUploaded.emit(newMedia);
          }
        });
      });
    }
  }

  // single file upload
  // async uploadFile(): Promise<void> {
  //   if (this.selectedFile && this.auth.uid) {
  //     this.isUploading = true;
  //     const thumbnailUrl = await this.captureVideoThumbnail(this.selectedFile);
  //     this.storage.uploadMedia(this.selectedFile, "videos", thumbnailUrl, this.auth.uid).subscribe(
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
