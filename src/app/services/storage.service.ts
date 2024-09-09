import { Injectable } from '@angular/core';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { Observable, finalize } from 'rxjs';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage, private dbService: DbService) {}

  uploadVideo(file: File, accountId: string, productId?: string, journeyId?: string, category?: string): Observable<any> {
    return new Observable<any>((observer) => {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `videos/${accountId}/${fileName}`; // Single storage path
      const storageRef = ref(this.storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({ progress, downloadURL: null }); // Emit progress updates
        },
        (error) => {
          observer.error(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
            // Save metadata in Firestore
            const videoMetadata = {
              name: fileName,
              accountId: accountId,
              url: downloadURL,
              products: productId ? [productId] : [],
              journeys: productId ? [journeyId] : [],
              uploadedAt: Date.now(),
              category: category || "",
            };

            await this.dbService.addVideo(videoMetadata);
            observer.next({ progress: 100, downloadURL, video: videoMetadata });
            observer.complete();
          });
        }
      );
    });
  }

  // Method to delete a video from Firebase Storage and Firestore
  deleteVideo(videoId: string, videoUrl: string): Observable<void> {
    return new Observable<void>((observer) => {
      const storageRef = ref(this.storage, videoUrl); // Reference to the video in Storage

      // First, delete the video from Firebase Storage
      deleteObject(storageRef)
        .then(() => {
          // After deleting the video from storage, remove its metadata from Firestore
          this.dbService.deleteVideo(videoId);
        })
        .then(() => {
          observer.next(); // Notify that the video was successfully deleted
          observer.complete();
        })
        .catch((error) => {
          console.error('Error deleting video:', error);
          observer.error(error); // Emit error if deletion fails
        });
    });
  }
}
