import { Injectable } from '@angular/core';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { Observable, finalize } from 'rxjs';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage, private db: DbService) {}

  uploadMedia(file: File, folder: string, tags: string[] = [], products: any[] = [], journeys: any[] = []): Observable<any> {
    const accountId = this.db.account.id;
    return new Observable<any>((observer) => {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${accountId}/${folder}/${fileName}`; // Single storage path
      const storageRef = ref(this.storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      const isVideo = folder === "videos";
      uploadTask.on('state_changed', (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({ progress, downloadURL: null }); // Emit progress updates
        }, (error) => {
          observer.error(error);
        }, () => {
          getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
            // Save metadata in Firestore
            const data: any = {
              name: fileName,
              type: file.type,
              accountId: accountId,
              journeys: journeys,
              originalName: file.name,
              products: products,
              tags: tags,
              uploadTime: new Date(),
              url: downloadURL,
            };

            if (isVideo) {
              const thumbnailUrl = await this.captureVideoThumbnail(file);
              data.thumbnailUrl = thumbnailUrl;
              const mediaId = await this.db.addMedia(data);
              await this.uploadThumbnail(thumbnailUrl, fileName, mediaId, accountId);
            } else {
              await this.db.addMedia(data);
            }

            observer.next({ progress: 100, downloadURL, media: data });
            observer.complete();
          });
        }
      );
    });
  }

  // Method to delete a media from Firebase Storage and Firestore
  async deleteMedia(media: any, folder: string) {
    const mediaId = media.id;
    const path = `${media.accountId}/${folder}/${media.name}`;
    const storageRef = ref(this.storage, path);
    
    // First, delete the media from Firebase Storage
    try {
      await deleteObject(storageRef);
      if (folder === 'videos') {
        const thumbnailPath = `${media.accountId}/${folder}/${media.name}_thumbnail.jpg`;
        const thumbnailRef = ref(this.storage, thumbnailPath);
        await deleteObject(thumbnailRef);
      }
      await this.db.deleteMedia(mediaId);
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  }

  uploadThumbnail(thumbnailDataURL: string, fileName: string, mediaId: string, accountId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(this.storage, `${accountId}/videos/${fileName}_thumbnail.jpg`);
      
      // Convert base64 data URL to Blob
      fetch(thumbnailDataURL)
        .then((res) => res.blob())
        .then((blob) => {
          const uploadTask = uploadBytesResumable(storageRef, blob);
  
          uploadTask.on(
            'state_changed',
            null,
            (error) => {
              reject('Error uploading thumbnail: ' + error);
            },
            () => {
              // Get download URL for the uploaded thumbnail
              getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
                resolve(downloadURL); // Resolve with the thumbnail's URL
              });
            }
          );
        });
    });
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

  
}
