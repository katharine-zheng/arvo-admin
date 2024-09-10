import { Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, QueryConstraint, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  private _account: any;
  private _videoTags: string[] = [];
  private _products: any[] = [];
  private _videos: any[] = [];

  get account() {
    return this._account;
  }

  get videoTags() {
    return this._videoTags;
  }

  get products() {
    return this._products;
  }
  
  get videos() {
    return this._videos;
  }

  constructor(private firestore: Firestore) {}

  async getAccount(accountId: string): Promise<any> {
    if (this._account) return;
    try {
      const docRef = doc(this.firestore, "accounts", accountId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const account: any = docSnap.data();
        this._account = account;
        this._videoTags = account.videoTags;
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
      item.accountId = this._account.id;
      item.journeys = {
        'prePurchase': [],
        'postPurchase': []
      }
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
    const q = query(collection(this.firestore, "products"),
      where("accountId", "==", this._account.id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      list.push({id: doc.id, ...doc.data()})
    });
    this._products = list;
    return list;
  }

  // Add a new journey to the product
  async addJourney(productId: string, journey: any): Promise<void> {
    const journeyCollectionRef = collection(this.firestore, 'journeys');
  
    // Add the new journey to the 'journeys' collection
    const journeyRef = await addDoc(journeyCollectionRef, {
      ...journey,
      creationTime: new Date(),
      updateTime: new Date(),
    });

    const productRef = doc(this.firestore, `products/${productId}`);
    const journeyKey = journey.type === 'prePurchase' ? 'journeys.prePurchase' : 'journeys.postPurchase';

    await updateDoc(productRef, {
      [`${journeyKey}`]: arrayUnion({
        id: journeyRef.id,
        type: journey.type,
        title: journey.title || '',
        creationTime: new Date(),
        updateTime: new Date(),
      })
    });
  }

  // Update an existing journey in the 'journeys' collection and update the metadata in the product doc
  async updateJourney(productId: string, journey: any): Promise<void> {
    const journeyRef = doc(this.firestore, `journeys/${journey.id}`);

    // Update the journey in the 'journeys' collection
    await updateDoc(journeyRef, {
      ...journey,
      updateTime: new Date(),
    });

    // Update the corresponding journey in the product document (pre_purchase or post_purchase)
    const productRef = doc(this.firestore, `products/${productId}`);
    const productDoc = await getDoc(productRef);

    if (productDoc.exists()) {
      const productData = productDoc.data();
      const updatedJourneys = productData['journeys'][journey.type].map((j: any) => {
        if (j.id === journey.id) {
          return {
            ...j,
            title: journey.title || j.title,
            updateTime: new Date(),
          };
        }
        return j;
      });

      await updateDoc(productRef, {
        [`journeys.${journey.type}`]: updatedJourneys,
      });
    }
  }

  // Delete a journey from the 'journeys' collection and remove it from the product document
  async deleteJourney(productId: string, journeyId: string, journeyType: 'pre_purchase' | 'post_purchase'): Promise<void> {
    const journeyRef = doc(this.firestore, `journeys/${journeyId}`);
    
    // Delete the journey from the 'journeys' collection
    await deleteDoc(journeyRef);
    
    // Remove the journey reference from the product document
    const productRef = doc(this.firestore, `products/${productId}`);
    const productDoc = await getDoc(productRef);

    if (productDoc.exists()) {
      const productData = productDoc.data();
      const updatedJourneys = productData['journeys'][journeyType].filter((j: any) => j.id !== journeyId);

      await updateDoc(productRef, {
        [`journeys.${journeyType}`]: updatedJourneys,
      });
    }
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
    this._videos = list;
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
    const accountDocRef = doc(this.firestore, `accounts/${this._account.id}`);

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
    const accountDocRef = doc(this.firestore, `accounts/${this._account.id}`);

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
    this._videoTags = this.videoTags.filter((t: string) => t !== tag);
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
      'videoTags': ["thank you message", "how to", "reviews"]
    }
  }
}
