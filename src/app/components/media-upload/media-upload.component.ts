import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-media-upload',
  templateUrl: './media-upload.component.html',
  styleUrl: './media-upload.component.css'
})
export class MediaUploadComponent {

  selectedFile: File | null = null;
  selectedFiles: File[] = [];
  uploadingVideos: any[] = [];
  uploadProgress: number = 0;
  downloadURL: string | null = null;
  isUploading: boolean = false;
  isDragging: boolean = false;  // State for drag-over effect

  @Output() onVideoUploaded: EventEmitter<any> = new EventEmitter<any>();

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
    this.uploadingVideos = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));
    this.uploadFiles();
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onFilesSelected(event: any, autoUpload: boolean): void {
    this.selectedFiles = Array.from(event.target.files); // Collect selected files
    this.uploadingVideos = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));

    if (autoUpload) {
      this.uploadFiles();
    }
  }

  captureThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.currentTime = 5; // Capture frame at 5 seconds or wherever you prefer
  
      // When video is loaded and ready
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
  
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
          // Convert canvas to a data URL (base64 image)
          const thumbnailUrl = canvas.toDataURL('image/jpeg');
          resolve(thumbnailUrl); // Resolve the promise with the thumbnail data URL
        } else {
          reject('Could not capture thumbnail');
        }
      };
  
      video.onerror = (error) => {
        reject('Error loading video: ' + error);
      };
    });
  }

  uploadFiles(): void {
    const newVideos: any[] = [];
    if (this.uploadingVideos && this.auth.uid) {
      this.isUploading = true;
      this.uploadingVideos.forEach(async (video, index) => {
        const thumbnailUrl = await this.captureThumbnail(video.file);
        this.storage.uploadVideo(video.file, thumbnailUrl, this.auth.uid!).subscribe(
        async (event) => {
          this.uploadingVideos[index].uploadProgress = event.progress; // Update the progress
          if (event.downloadURL) {
            this.uploadingVideos[index].downloadURL = event.downloadURL; // Update the progress
            newVideos.push(event.video);
            // Capture the thumbnail after video upload is complete
            // Upload the thumbnail
            // await this.storage.uploadThumbnail(thumbnailUrl, video.file.name, event.id);
          }
          this.changeRef.detectChanges();
        },
        (error) => {
          console.error('Error uploading file:', error);
          this.isUploading = false;
        }
        ,() => {
          if (this.uploadingVideos.every(v => v.uploadProgress === 100)) {
            this.isUploading = false;
            this.uploadingVideos = [];
            this.selectedFiles = [];

            // setTimeout(() => this.onVideoUploaded.emit(), 5000);
            this.onVideoUploaded.emit(newVideos);
          }
        }
        );
      });
    }
  }

  async uploadFile(): Promise<void> {
    if (this.selectedFile && this.auth.uid) {
      this.isUploading = true;
      const thumbnailUrl = await this.captureThumbnail(this.selectedFile);
      this.storage.uploadVideo(this.selectedFile, thumbnailUrl, this.auth.uid).subscribe(
        (event) => {
          this.uploadProgress = event.progress;
          if (event.downloadURL) {
            this.downloadURL = event.downloadURL;
            this.isUploading = false;
            this.selectedFile = null;
            this.onVideoUploaded.emit([event.video]);
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
