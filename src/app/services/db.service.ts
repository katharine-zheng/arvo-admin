import { Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, QueryConstraint, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  public account: any;
  public videoTags: string[] = [];
  public videos: any[] = [];

  constructor(private firestore: Firestore) {}

  async getAccount(accountId: string): Promise<any> {
    if (this.account) return;
    try {
      const docRef = doc(this.firestore, "accounts", accountId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const account: any = docSnap.data();
        this.account = account;
        this.videoTags = account.videoTags;
        return account;
      }
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.getAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async createAccount(fbUser: any) {
    const newUser = this.setNewAccount(fbUser);
    if (newUser && newUser.id) {
      const dateCreated = serverTimestamp();
      newUser['dateCreated'] = dateCreated;
      newUser['dateLastLogin'] = dateCreated;
      newUser['dateUpdated'] = dateCreated;

      try {
        const userRef = doc(this.firestore, "accounts", newUser.id);
        const docSnap = await getDoc(userRef);
  
        if (docSnap.exists()) {
          throw new Error(`Account document with id ${newUser.id} already exists.`);
        }
        await setDoc(userRef, newUser);
      } catch (error) {
        // this.handleError(error);
        // await this.logError(error, "Admin.DbService.createAccount");
        // const customErrorMessage: string = this.handleError(error);
        // throw new Error(customErrorMessage);
      }
    }
  }

  async createProduct(item: any) {
    try {
      item['dateCreated'] = serverTimestamp();
      item['dateUpdated'] = serverTimestamp();
      await addDoc(collection(this.firestore, "products"), item);
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.createSubscription");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async updateProduct(id: string, data: any) {
    try {
      const userRef = doc(this.firestore, "products", id);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
          console.error(`Account document with id ${id} does not exist.`);
          return false;
      }

      data['updateTime'] = serverTimestamp();
      await updateDoc(userRef, data);
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.updateAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
    return;
  }

  async deleteProduct(id: string) {
    const docRef = doc(this.firestore, "products", id);
    await deleteDoc(docRef);
  }

  async getProducts() {
    let list: any[] = [];
    const q = query(collection(this.firestore, "products"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      list.push({id: doc.id, ...doc.data()})
    });
    return list;
  }

  async addVideo(videoMetadata: any) {
    const videoRef = collection(this.firestore, 'videos');
    const docRef = await addDoc(videoRef, videoMetadata);
    return docRef.id;
  }

  async getVideos(accountId: string, productId?: string, journeyId?: string) {
    let list: any[] = [];
    let queries: QueryConstraint[] = [where('accountId', '==', accountId)];

    if (productId) {
      queries.push(where('productIds', 'array-contains', productId))
    }

    if (journeyId) {
      queries.push(where('journeyIds', 'array-contains', journeyId))
    }

    const mediaLibraryVideos = query(collection(this.firestore, 'videos'), ...queries);
    const querySnapshot = await getDocs(mediaLibraryVideos);
    querySnapshot.forEach((doc) => {
      list.push({id: doc.id, ...doc.data()})
    });
    this.videos = list;
    return list;
  }

  async deleteVideo(videoId: string) {
    const videoDocRef = doc(this.firestore, `videos/${videoId}`);
    return await deleteDoc(videoDocRef);
  }

  saveVideoThumbnail(videoId: string, thumbnailURL: string): Promise<void> {
    const videoDocRef = doc(this.firestore, `videos/${videoId}`);
    return updateDoc(videoDocRef, {
      thumbnailURL: thumbnailURL
    });
  }

  async addTagToAccount(tag: string) {
    const accountDocRef = doc(this.firestore, `accounts/${this.account.id}`);

    // Update the account doc by adding the tag to the tags array if it doesn't exist
    await updateDoc(accountDocRef, {
      videoTags: arrayUnion(tag),
    });
  }

  async addTagToVideo(tag: string, videoId: string) {
    // Now update the video document with the selected tag
    const videoDocRef = doc(this.firestore, `videos/${videoId}`);
    await updateDoc(videoDocRef, {
      tags: arrayUnion(tag),
      tag: tag,
    });
  }

  // Remove a tag from the categories array in the account doc
  async deleteTag(tag: string): Promise<void> {
    const accountDocRef = doc(this.firestore, `accounts/${this.account.id}`);

    // Remove the tag from the account's categories array
    await updateDoc(accountDocRef, {
      videoTags: arrayRemove(tag),
    });

    // Optionally, unassign the tag from all videos that use it (if required)
    const videoCollectionRef = collection(this.firestore, 'videos');
    const q = query(videoCollectionRef, where('tag', '==', tag));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnapshot) => {
      updateDoc(docSnapshot.ref, { category: '' }); // Unassign the category from the video
    });

    this.removeTagsLocally(tag);
    
  }

  async removeTagFromVideo(videoId: string, tag: string): Promise<void> {
    const videoDocRef = doc(this.firestore, `videos/${videoId}`);
    await updateDoc(videoDocRef, {
      videoTags: arrayRemove(tag),
      tag: tag,
    });
  }

  private removeTagsLocally(tag: string) {
    this.videoTags = this.videoTags.filter((t) => t !== tag);
  }

  private setNewAccount(fbUser: User): any {
    return {
      'display': {},
      'displayName': fbUser.displayName,
      'email': fbUser.email,
      'emailVerified': fbUser.emailVerified,
      'journeys': [],
      'phoneNumber': fbUser.phoneNumber,
      'photoURL': fbUser.photoURL,
      'id': fbUser.uid,
      'providerData': fbUser.providerData,
      'settings': {},
    }
  }
}
