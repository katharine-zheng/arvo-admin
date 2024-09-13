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
  public isDragging: boolean = false;  // State for drag-over effect

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
    this.selectedFiles = Array.from(event.target.files); // Collect selected files
    this.uploadingMedia = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));

    if (autoUpload) {
      this.uploadFiles();
    }
  }

  captureVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const media = document.createElement('video');
      media.src = URL.createObjectURL(file);
      media.crossOrigin = 'anonymous';
      media.currentTime = 5; // Capture frame at 5 seconds or wherever you prefer
  
      // When media is loaded and ready
      media.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = media.videoWidth;
        canvas.height = media.videoHeight;
  
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(media, 0, 0, canvas.width, canvas.height);
  
          // Convert canvas to a data URL (base64 image)
          const thumbnailUrl = canvas.toDataURL('image/jpeg');
          resolve(thumbnailUrl); // Resolve the promise with the thumbnail data URL
        } else {
          reject('Could not capture thumbnail');
        }
      };
  
      media.onerror = (error) => {
        reject('Error loading video: ' + error);
      };
    });
  }

  uploadFiles(): void {
    const newMedia: any[] = [];
    if (this.uploadingMedia && this.auth.uid) {
      this.isUploading = true;
      this.uploadingMedia.forEach(async (media, index) => {
        const thumbnailUrl = await this.captureVideoThumbnail(media.file);
        this.storage.uploadMedia(media.file, thumbnailUrl, this.auth.uid!).subscribe(
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
        },
        (error) => {
          console.error('Error uploading file:', error);
          this.isUploading = false;
        }
        ,() => {
          if (this.uploadingMedia.every(v => v.uploadProgress === 100)) {
            this.isUploading = false;
            this.uploadingMedia = [];
            this.selectedFiles = [];
            this.onMediaUploaded.emit(newMedia);
          }
        }
        );
      });
    }
  }

  async uploadFile(): Promise<void> {
    if (this.selectedFile && this.auth.uid) {
      this.isUploading = true;
      const thumbnailUrl = await this.captureVideoThumbnail(this.selectedFile);
      this.storage.uploadMedia(this.selectedFile, thumbnailUrl, this.auth.uid).subscribe(
        (event) => {
          this.uploadProgress = event.progress;
          if (event.downloadURL) {
            this.downloadURL = event.downloadURL;
            this.isUploading = false;
            this.selectedFile = null;
            this.onMediaUploaded.emit([event.media]);
          }
          this.changeRef.detectChanges();
        },
        (error) => {
          console.error('Error uploading file:', error);
        }
      );
    }
  }
}
