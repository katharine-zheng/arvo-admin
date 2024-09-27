import { Injectable } from '@angular/core';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { Observable, finalize } from 'rxjs';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage, private db: DbService) {}

  uploadMedia(file: File, thumbnailUrl: string, accountId: string, productId?: string, journeyId?: string, tag?: string): Observable<any> {
    return new Observable<any>((observer) => {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `media/${accountId}/${fileName}`; // Single storage path
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
            const data = {
              name: fileName,
              accountId: accountId,
              // journeys: productId ? [journeyId] : [],
              originalName: file.name,
              // products: productId ? [productId] : [],
              tags: [],
              thumbnailUrl: thumbnailUrl,
              type: 'video',
              uploadTime: Date.now(),
              url: downloadURL,
            };

            const mediaId = await this.db.addMedia(data);
            await this.uploadThumbnail(thumbnailUrl, fileName, mediaId, accountId);
            // await this.db.saveMediaThumbnail(mediaId, downloadURL);
            observer.next({ progress: 100, downloadURL, media: data });
            observer.complete();
          });
        }
      );
    });
  }

  // Method to delete a media from Firebase Storage and Firestore
  async deleteMedia(media: any) {
    const mediaId = media.id;
    const path = `media/${media.accountId}/${media.name}`;
    const thumbnailPath = `thumbnails/${media.accountId}/${media.name}.jpg`;
    const storageRef = ref(this.storage, path);
    const thumbnailRef = ref(this.storage, thumbnailPath);

    // First, delete the media from Firebase Storage
    try {
      await deleteObject(storageRef);
      await deleteObject(thumbnailRef);
      await this.db.deleteMedia(mediaId);
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  }

  uploadThumbnail(thumbnailDataURL: string, fileName: string, mediaId: string, accountId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(this.storage, `thumbnails/${accountId}/${fileName}.jpg`);
      
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
  
}
