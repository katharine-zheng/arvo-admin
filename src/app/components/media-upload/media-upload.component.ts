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

  onFilesSelected(event: any): void {
    this.selectedFiles = Array.from(event.target.files); // Collect selected files
    this.uploadingVideos = this.selectedFiles.map((file) => ({ file, uploadProgress: 0 }));
  }

  uploadFiles(): void {
    const newVideos: any[] = [];
    if (this.uploadingVideos && this.auth.uid) {
      this.isUploading = true;
      this.uploadingVideos.forEach((video, index) => {
        this.storage.uploadVideo(video.file, this.auth.uid!).subscribe(
        (event) => {
          this.uploadingVideos[index].uploadProgress = event.progress; // Update the progress
          if (event.downloadURL) {
            this.uploadingVideos[index].downloadURL = event.downloadURL; // Update the progress
            newVideos.push(event.video);
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
            this.onVideoUploaded.emit(newVideos);
            alert('All videos uploaded successfully!');
          }
        }
        );
      });
    }
  }

  uploadFile(): void {
    if (this.selectedFile && this.auth.uid) {
      this.isUploading = true;
      this.storage.uploadVideo(this.selectedFile, this.auth.uid).subscribe(
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
