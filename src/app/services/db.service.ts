import { Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, QueryConstraint, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { QRCODE } from '../constants/qrcode';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  private _account: any;
  private _journey: any;
  private _mediaTags: string[] = [];
  private _journeys: any[] = [];
  private _products: any[] = [];
  private _media: any[] = [];

  private productItems: any = {};
  private journeyItems: any = {};

  private accountSource = new BehaviorSubject<any>(null);
  public currentAccount = this.accountSource.asObservable();
  private productSource = new BehaviorSubject<any>(null);
  public currentProduct = this.productSource.asObservable();
  private journeySource = new BehaviorSubject<any>(null);
  public currentJourney = this.journeySource.asObservable();

  get projectId(): string {
    return environment.firebase.projectId;
  }

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

  setAccountData(account: any) {
    this.accountSource.next(account);
  }

  getAccountData() {
    return this.accountSource.getValue();
  }

  setProductData(product: any) {
    this.productSource.next(product);
  }

  getProductData() {
    return this.productSource.getValue();
  }

  setJourneyData(journey: any) {
    this.journeySource.next(journey);
  }

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
        this.setAccountData(account);
        return account;
      }
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.getAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async createAccount(fbUser: any, platform?: any): Promise<boolean> {
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
        return true;
      } catch (error) {
        console.error(error);
        // this.handleError(error);
        // await this.logError(error, "Admin.DbService.createAccount");
        // const customErrorMessage: string = this.handleError(error);
        // throw new Error(customErrorMessage);
      }
    } else {
      console.error("user is null");
    }
    return false;
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
      console.error(error);
    }
  }

  async updateQRSettings(qrCodeSettings: any) {
    const userRef = doc(this.firestore, "accounts", this.account.id);
    updateDoc(userRef, {'settings.qrCode':  qrCodeSettings});
  }

  async shopifyAccountExists(domain: string) {
    try {
      // Define the query to check for the myshopify_domain in platformStores collection
      const platformStoresRef = collection(this.firestore, 'platformStores');
      const q = query(platformStoresRef, where('shopDomain', '==', domain));

      // Execute the query
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking myshopify_domain: ', error);
      return false;
    }
  }

  async updateAccountTags(tags: any[]) {
    const accountDocRef = doc(this.firestore, "accounts", this._account.id);

    // Update the account doc by adding the tag to the tags array if it doesn't exist
    await updateDoc(accountDocRef, {
      mediaTags: tags,
    });
    this._mediaTags = this.account.mediaTags;
  }

  async addTagToAccount(tag: string) {
    const accountDocRef = doc(this.firestore, "accounts", this._account.id);

    // Update the account doc by adding the tag to the tags array if it doesn't exist
    await updateDoc(accountDocRef, {
      mediaTags: arrayUnion(tag),
    });
    this._mediaTags = this.account.mediaTags;
  }

  async removeTagFromAccount(tag: string): Promise<void> {
    const accountDocRef = doc(this.firestore, "accounts", this._account.id);
    await updateDoc(accountDocRef, {
      mediaTags: arrayRemove(tag),
    });
    this._mediaTags = this._mediaTags.filter((t: string) => t !== tag);
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

  async getProduct(id: string): Promise<any> {
    if (this.productItems.id) return this.productItems.id;
    try {
      const docRef = doc(this.firestore, "products", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const product: any = docSnap.data();
        this.productItems.id = product;
        this.setJourneyData(product);
        return product;
      }
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.getAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
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

  async deleteProduct(data: any) {
    try {
      const ref = doc(this.firestore, "products", data.id);
      // TODO remove journeys
      const batch = writeBatch(this.firestore);
      batch.delete(ref);
      await batch.commit();
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.createSubscription");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async getJourney(id: string): Promise<any> {
    if (this.journeyItems.id) return this.journeyItems.id;
    try {
      const docRef = doc(this.firestore, "journeys", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const journey: any = docSnap.data();
        this._journey = journey;
        this.journeyItems.id = journey;
        this.setJourneyData(journey);
        return journey;
      }
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.getAccount");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
  }

  async getJourneys() {
    let list: any[] = [];
    if (this._account && this._account.id) {
      if (this._journeys) return this._journeys;
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
      const batch = writeBatch(this.firestore);
      const ref = doc(collection(this.firestore, "journeys"));
      const productRef = doc(this.firestore, "products", data.productId);
      data.id = ref.id;
      batch.set(ref, data);
      batch.update(productRef, {
        journeys: arrayUnion(data.id)
      });
      await batch.commit();
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

  async deleteJourney(data: any) {
    try {
      const ref = doc(this.firestore, "journeys", data.id);
      const productRef = doc(this.firestore, "products", data.productId);
      const batch = writeBatch(this.firestore);
      batch.delete(ref);
      batch.update(productRef, {
        journeys: arrayRemove(data.id),
      });
      await batch.commit();
    } catch (error) {
      // this.handleError(error);
      // await this.logError(error, "Admin.DbService.createSubscription");
      // const customErrorMessage: string = this.handleError(error);
      // throw new Error(customErrorMessage);
    }
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

    const productRef = doc(this.firestore, "products", productId);
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
    const journeyRef = doc(this.firestore, "journeys", journey.id);

    // Update the journey in the 'journeys' collection
    await updateDoc(journeyRef, {
      ...journey,
      updateTime: new Date(),
    });

    // Update the corresponding journey in the product document (pre_purchase or post_purchase)
    const productRef = doc(this.firestore, "products", productId);
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
    const journeyRef = doc(this.firestore, "journeys", journeyId);
    
    // Delete the journey from the 'journeys' collection
    await deleteDoc(journeyRef);
    
    // Remove the journey reference from the product document
    const productRef = doc(this.firestore, "products", productId);
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
    const ref = doc(collection(this.firestore, "media"));
    data.id = ref.id;
    await setDoc(ref, data);
    this._media.push(data);
    return ref.id;
  }

  async deleteMedia(mediaId: string) {
    const mediaDocRef = doc(this.firestore, "media", mediaId);
    const productsRef = collection(this.firestore, 'products');
    const productQuery = query(productsRef, where('videoIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);
    const batch = writeBatch(this.firestore);

    batch.delete(mediaDocRef);
    productSnapshots.forEach((product) => {
      const productData = product.data();
      const videos = productData['videos'].filter((media: any) => media.id !== mediaId);
      const videoIds = productData['videoIds'].filter((id: string) => id !== mediaId);
      const productRef = doc(this.firestore, "products", product.id);
      batch.update(productRef, {
        videos,
        videoIds
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

  async addTagToMedia(tag: string, media: any) {
    const mediaId = media.id;
    const mediaDocRef = doc(this.firestore, "media", mediaId);
    await updateDoc(mediaDocRef, {
      tags: arrayUnion(tag)
    });

    const productsRef = collection(this.firestore, 'products');
    const productQuery = query(productsRef, where('videoIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);
    
    productSnapshots.forEach(async (product) => {
      const productData = product.data();
      
      // Map over videos to find the media item and use arrayUnion to add the new tag
      const updatedvideos = productData['videos'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: [...media.tags, tag]
          };
        }
        return media;
      });
  
      // Update the product with the modified videos
      const productRef = doc(this.firestore, "products", product.id);
      await updateDoc(productRef, {
        videos: updatedvideos
      });
    });

    const journeysRef = collection(this.firestore, 'journeys');
    const journeyQuery = query(journeysRef, where('videoIds', 'array-contains', mediaId));
    const journeySnapshots = await getDocs(journeyQuery);

    journeySnapshots.forEach(async (journey) => {
      const journeyData = journey.data();
      
      // Map over videos to find the media item and use arrayUnion to add the new tag
      const updatedvideos = journeyData['videos'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: [...media.tags, tag]
          };
        }
        return media;
      });

      // Update the journey with the modified videos
      const journeyRef = doc(this.firestore, "journeys", journey.id);
      await updateDoc(journeyRef, {
        videos: updatedvideos
      });
    });
  }

  async removeTagFromMedia(tag: string, media: any): Promise<void> {
    const mediaId = media.id;
    const mediaDocRef = doc(this.firestore, `media/${mediaId}`);
    await updateDoc(mediaDocRef, {
      tags: arrayRemove(tag),
    });

    // Query all products where the mediaId exists in the videoIds array
    const productsRef = collection(this.firestore, 'products');
    const productQuery = query(productsRef, where('videoIds', 'array-contains', mediaId));
    const productSnapshots = await getDocs(productQuery);
    
    productSnapshots.forEach(async (product) => {
      const productData = product.data();
      
      // Map over videos to find the media item and use arrayRemove to remove the tag
      const updatedvideos = productData['videos'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: media.tags.filter((t: string) => t !== tag)
          };
        }
        return media;
      });
  
      // Update the product with the modified videos
      const productRef = doc(this.firestore, "products", product.id);
      await updateDoc(productRef, {
        videos: updatedvideos
      });
    });

    const journeysRef = collection(this.firestore, 'journeys');
    const journeyQuery = query(journeysRef, where('videoIds', 'array-contains', mediaId));
    const journeySnapshots = await getDocs(journeyQuery);
    journeySnapshots.forEach(async (journey) => {
      const journeyData = journey.data();
      
      // Map over videos to find the media item and use arrayRemove to remove the tag
      const updatedvideos = journeyData['videos'].map((media: any) => {
        if (media.id === mediaId) {
          return {
            ...media,
            tags: media.tags.filter((t: string) => t !== tag)
          };
        }
        return media;
      });
  
      // Update the journey with the modified videos
      const journeyRef = doc(this.firestore, "journeys", journey.id);
      await updateDoc(journeyRef, {
        videos: updatedvideos
      });
    });
  }

  async addMediaToProduct(productId: string, media: any[]) {
    const productRef = doc(this.firestore, "products", productId);
    const videoIds = media.map((media: any) => media.id);

    try {
      await updateDoc(productRef, {
        videos: arrayUnion(...media),
        videoIds: arrayUnion(...videoIds),
      });
    } catch (error) {
      console.error('Error adding media to the journey:', error);
    }
  }

  async addMediaToJourney(journeyId: string, media: any[]) {
    const journeyRef = doc(this.firestore, "journeys", journeyId);
    const videoIds = media.map((media: any) => media.id);

    try {
      await updateDoc(journeyRef, {
        videos: arrayUnion(...media),
        videoIds: arrayUnion(...videoIds),
      });
    } catch (error) {
      console.error('Error adding media to the journey:', error);
    }
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
      'platformStores': {},
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
