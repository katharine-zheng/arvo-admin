import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithEmailLink, signOut } from '@angular/fire/auth';
import { setPersistence, browserLocalPersistence, User } from 'firebase/auth'

import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  get uid() {
    return this.auth.currentUser?.uid;
  }
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  
  private authState = new BehaviorSubject<boolean>(false);
  private actionCodeSettings = {
    url: 'http://localhost:4200/auth',  // Replace with your app's redirect URL
    handleCodeInApp: true,
  };
  constructor(private auth: Auth, private dbService: DbService, private router: Router) {
    // const storedUser = sessionStorage.getItem('firebaseUser');
    // if (storedUser) {
    //   const user = JSON.parse(storedUser);
    // }

    setPersistence(this.auth, browserLocalPersistence);

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.authState.next(true);
        this.setUser(user);  // Update the AuthService
        setPersistence(auth, browserLocalPersistence);
        this.dbService.getAccount(user.uid);
      } else {
        this.setUser(null);
        this.authState.next(false);
      }
    });
  }

  setUser(user: User | null) {
    this.userSubject.next(user);
  }

  getCurrentUser() {
    return this.userSubject.value;
  }
  // Auth state observable
  isLoggedIn(): Observable<boolean> {
    return this.authState.asObservable();
  }

  // saveSession() {
    // sessionStorage.setItem('firebaseUser', JSON.stringify(this.auth.currentUser));
  // }

  async register(email: string, password: string, platform?: any): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.dbService.createAccount(userCredential.user, platform);
      this.router.navigate(['/dashboard']);
      this.authState.next(true);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }
  
  // Login using email and password
  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      await this.dbService.getAccount(userCredential.user.uid);
      // this.router.navigate(['/dashboard']);
      this.authState.next(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }

    // return setPersistence(this.auth, browserLocalPersistence) // Set persistence
    //   .then(() => signInWithEmailAndPassword(this.auth, email, password)) // Log in the user
    //   .then(() => {
    //     this.authState.next(true);
    //     this.router.navigate(['/dashboard']); // Redirect to dashboard after login
    //   })
    //   .catch((error) => {
    //     console.error('Login failed:', error);
    //     throw error;
    //   });
  }

  // Logout function
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.authState.next(false);
      // this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Function to send sign-in link to the user's email
  async sendSignInLink(email: string): Promise<void> {
    return sendSignInLinkToEmail(this.auth, email, this.actionCodeSettings)
      .then(() => {
        window.localStorage.setItem('emailForSignIn', email); // Save the email locally
        alert('Sign-in link sent to your email.');
      })
      .catch((error) => {
        console.error('Error sending sign-in link:', error);
      });
  }

  // Function to complete sign-in using the email link
  async completeSignIn(url: string): Promise<void> {
    if (isSignInWithEmailLink(this.auth, url)) {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // Ask the user for their email if it was not saved locally
        const enteredEmail = window.prompt('Please provide your email for confirmation');
        if (enteredEmail) {
          return signInWithEmailLink(this.auth, enteredEmail, url).then(() => {
            window.localStorage.removeItem('emailForSignIn');
            // this.router.navigate(['/dashboard']); // Redirect to dashboard or any other page
          });
        }
      } else {
        return signInWithEmailLink(this.auth, email, url).then(() => {
          window.localStorage.removeItem('emailForSignIn');
          // this.router.navigate(['/dashboard']);
        });
      }
    }
    return Promise.resolve();
  }
}
