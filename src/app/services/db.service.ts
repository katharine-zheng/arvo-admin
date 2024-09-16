import { Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, QueryConstraint, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { QRCODE } from '../constants/qrcode';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  private _account: any;
  private _mediaTags: string[] = [];
  private _journeys: any[] = [];
  private _products: any[] = [];
  private _media: any[] = [];

  private productSource = new BehaviorSubject<any>(null);
  currentProduct = this.productSource.asObservable();
  private journeySource = new BehaviorSubject<any>(null);
  currentJourney = this.journeySource.asObservable();

  get account() {
    return this._account;
  }

  get mediaTags() {
    if (this._account) {
      return this._account.mediaTags;
    }
    return [];
  }

  get journeys() {
    return this._journeys;
  }

  get products() {
    return this._products;
  }
  
  get media() {
    return this._media;
  }

  constructor(private firestore: Firestore) {}

  // Method to set the product data
  setProductData(product: any) {
    this.productSource.next(product);
  }

  // Method to get the current product data
  getProductData() {
    return this.productSource.getValue();
  }

  // Method to set the product data
  setJourneyData(journey: any) {
    this.journeySource.next(journey);
  }

  // Method to get the current product data
  getJourneyData() {
    return this.journeySource.getValue();
  }

  async deleteDocument(collection: string, id: string) {
    const docRef = doc(this.firestore, collection, id);
    await deleteDoc(docRef);
  }
  
  async getAccount(accountId: string): Promise<any> {
    if (this._account) return;
    try {
      const docRef = doc(this.firestore, "accounts", accountId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const account: any = docSnap.data();
        this._account = account;
        this._mediaTags = account.mediaTags;
        return account;
      }
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.getAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async createAccount(fbUser: any, platform?: any) {
    const newUser = this.setNewAccount(fbUser);
    if (newUser && newUser.id) {
      const dateCreated = serverTimestamp();
      newUser['dateCreated'] = dateCreated;
      newUser['dateLastLogin'] = dateCreated;
      newUser['dateUpdated'] = dateCreated;
      newUser['platforms'] = platform ?? {}; //TODO test

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

  async updateAccount(data: any) {
    try {
      const userRef = doc(this.firestore, "accounts", this.account.id);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        console.error(`Account document with id ${this.account.id} does not exist.`);
        return false;
      }
      data['updateTime'] = serverTimestamp();
      await updateDoc(userRef, data);
      this.updateLocalDoc(this.account, data);
      return this.account;
    } catch (error) {
      
    }
  }

  async shopifyAccountExists(id: string, shop: string) {
    if (!this.account) {
      this._account = await this.getAccount(id);
    }
    if (this.account && this.account.platforms.shopify && 
      this.account.platforms.shopify.shop && 
      this.account.platforms.shopify.shop[shop]) {
        console.log('shop already exists');
        return true;
      }
    return false;
  }

  async addShopifyToAccount(shop: string) {
    if (this.account.platforms.shopify && 
      this.account.platforms.shopify[shop]) {
      console.log('shop already exists');
      return;
    }
    const q = query(collection(this.firestore, "accounts"),
      where(`platforms.shopify.${shop}`, "!=", null));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const shopifyKey = `platforms.shopify.${shop}`;
      const platform = {
        [`${shopifyKey}`]: {}
      };
      console.log(platform);
      await this.updateAccount(platform);
      return true;
    } else {
      console.error("This shopify store has already been connected");
    }
    return false;
  }

  async updateQRSettings(qrCodeSettings: any) {
    const userRef = doc(this.firestore, "accounts", this.account.id);
    updateDoc(userRef, {'settings.qrCode':  qrCodeSettings});
  }

  async addTagToAccount(tag: string) {
    const accountDocRef = doc(this.firestore, `accounts/${this._account.id}`);

    // Update the account doc by adding the tag to the tags array if it doesn't exist
    await updateDoc(accountDocRef, {
      mediaTags: arrayUnion(tag),
    });
    this._mediaTags = this.account.mediaTags;
  }

  async getProducts() {
    let list: any[] = [];
    if (this._account && this._account.id) {
      try {
        const q = query(collection(this.firestore, "products"),
          where("accountId", "==", this._account.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          list.push({id: doc.id, ...doc.data()})
        });
        this._products = list;
      } catch (error) {

      }
    }
    return list;
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

  async getJourneys() {
    let list: any[] = [];
    if (this._account && this._account.id) {
      try {
        const q = query(collection(this.firestore, "journeys"),
          where("accountId", "==", this._account.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          list.push({id: doc.id, ...doc.data()})
        });
        this._journeys = list;
      } catch (error) {
      }
    }
    return list;
  }

  async createJourney(data: any) {
    try {
      data['dateCreated'] = serverTimestamp();
      data['dateUpdated'] = serverTimestamp();
      await addDoc(collection(this.firestore, "journeys"), data);
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.createSubscription");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async updateJourney(id: string, data: any) {
    try {
      const userRef = doc(this.firestore, "journeys", id);
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

  // Add a new journey to the product
  async addProductJourney(productId: string, journey: any): Promise<void> {
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
        accountId: this.account.id,
        id: journeyRef.id,
        type: journey.type,
        name: journey.name,
        creationTime: new Date(),
        updateTime: new Date(),
      })
    });
  }

  // Update an existing journey in the 'journeys' collection and update the metadata in the product doc
  async updateProductJourney(productId: string, journey: any): Promise<void> {
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
  async deleteProductJourney(productId: string, journeyId: string, journeyType: 'pre_purchase' | 'post_purchase'): Promise<void> {
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

  async getMedia(accountId: string, productId?: string, journeyId?: string) {
    let list: any[] = [];
    let queries: QueryConstraint[] = [where('accountId', '==', accountId)];

    if (productId) {
      queries.push(where('productIds', 'array-contains', productId))
    }

    if (journeyId) {
      queries.push(where('journeyIds', 'array-contains', journeyId))
    }

    const q = query(collection(this.firestore, 'media'), ...queries);
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      list.push({id: doc.id, ...doc.data()})
    });
    this._media = list;
    return list;
  }

  async addMedia(data: any) {
    const mediaRef = collection(this.firestore, 'media');
    const docRef = await addDoc(mediaRef, data);
    return docRef.id;
  }

  async deleteMedia(mediaId: string) {
    const mediaDocRef = doc(this.firestore, `media/${mediaId}`);
    await deleteDoc(mediaDocRef);

    const productsRef = collection(this.firestore, 'products');
    const productQuery = query(productsRef, where('mediaIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);

    const batch = writeBatch(this.firestore); // Use a batch for atomic updates
    productSnapshots.forEach((productDoc) => {
      const productData = productDoc.data();
      const mediaList = productData['mediaList'].filter((media: any) => media.id !== mediaId);
      const mediaIds = productData['mediaIds'].filter((id: string) => id !== mediaId);
      const productRef = doc(this.firestore, `products/${productDoc.id}`);
      batch.update(productRef, {
        mediaList,
        mediaIds
      });
    });
  
    await batch.commit();
  }

  saveMediaThumbnail(mediaId: string, thumbnailURL: string): Promise<void> {
    const mediaDocRef = doc(this.firestore, `media/${mediaId}`);
    return updateDoc(mediaDocRef, {
      thumbnailURL: thumbnailURL
    });
  }

  async addMediaToProduct(productId: string, media: any[]) {
    // Reference the journey document
    const productRef = doc(this.firestore, `products/${productId}`);
    const mediaIds = media.map((media: any) => media.id);

    try {
      // Update the journey document by adding the selected media to the 'mediaList' array
      await updateDoc(productRef, {
        mediaList: arrayUnion(...media),
        mediaIds: mediaIds,
      });
    } catch (error) {
      console.error('Error adding media to the journey:', error);
    }
  }

  async addTagToMedia(tag: string, media: any) {
    const mediaId = media.id;
    const mediaDocRef = doc(this.firestore, `media/${mediaId}`);
    await updateDoc(mediaDocRef, {
      tags: arrayUnion(tag)
    });

    const productsRef = collection(this.firestore, 'products');
    const productQuery = query(productsRef, where('mediaIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);
    
    productSnapshots.forEach(async (productDoc) => {
      const productData = productDoc.data();
      
      // Map over mediaList to find the media item and use arrayUnion to add the new tag
      const updatedMediaList = productData['mediaList'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: [...media.tags, tag]
          };
        }
        return media;
      });
  
      // Update the product with the modified mediaList
      const productRef = doc(this.firestore, `products/${productDoc.id}`);
      await updateDoc(productRef, {
        mediaList: updatedMediaList
      });
    });
  }

  // Remove a tag from the categories array in the account doc
  async removeTagFromAccount(tag: string): Promise<void> {
    const accountDocRef = doc(this.firestore, `accounts/${this._account.id}`);

    // Remove the tag from the account's categories array
    await updateDoc(accountDocRef, {
      tags: arrayRemove(tag),
    });

    // Optionally, unassign the tag from all media that use it (if required)
    const mediaCollection = collection(this.firestore, 'media');
    const q = query(mediaCollection, where('tags', 'array-contains', tag));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnapshot) => {
      updateDoc(docSnapshot.ref, { category: '' }); // Unassign the category from the media
    });

    this._mediaTags = this._mediaTags.filter((t: string) => t !== tag);
  }

  async removeTagFromMedia(tag: string, media: any): Promise<void> {
    const mediaId = media.id;
    const mediaDocRef = doc(this.firestore, `media/${mediaId}`);
    await updateDoc(mediaDocRef, {
      tags: arrayRemove(tag),
    });

    const productsRef = collection(this.firestore, 'products');
    // Query all products where the mediaId exists in the mediaIds array
    const productQuery = query(productsRef, where('mediaIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);
    
    productSnapshots.forEach(async (productDoc) => {
      const productData = productDoc.data();
      
      // Map over mediaList to find the media item and use arrayRemove to remove the tag
      const updatedMediaList = productData['mediaList'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: media.tags.filter((t: string) => t !== tag)
          };
        }
        return media;
      });
  
      // Update the product with the modified mediaList
      const productRef = doc(this.firestore, `products/${productDoc.id}`);
      await updateDoc(productRef, {
        mediaList: updatedMediaList
      });
    });
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
      'platforms': {},
      'providerData': fbUser.providerData,
      'settings': {
        'qrCode': QRCODE,
      },
      'mediaTags': ["thank you message", "how to", "reviews"]
    }
  }

  private updateLocalDoc(localDoc: any, data: any) {
    for (let key in data) {
      if (key.includes('.')) {
        const keys = key.split('.');
        if (localDoc[keys[0]]) {
          localDoc[keys[0]][keys[1]] = data[key];
        }
      } else {
        localDoc[key] = data[key];
      }
    }
  }
}
