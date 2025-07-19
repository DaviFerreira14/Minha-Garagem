import { Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signOut, updateProfile, onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider,
  signInWithPopup, setPersistence, browserLocalPersistence, browserSessionPersistence
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnInit {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private authStateInitializedSubject = new BehaviorSubject<boolean>(false);
  public authStateInitialized$ = this.authStateInitializedSubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {}

  ngOnInit(): void {
    this.initAuthStateListener();
  }

  async setPersistence(rememberMe: boolean): Promise<void> {
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(this.auth, persistence);
    } catch (error) {
      console.error('Error setting persistence:', error);
    }
  }

  private initAuthStateListener() {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const docSnap = await getDoc(docRef);
        const userData = docSnap.exists() ? docSnap.data() : {};

        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: userData['displayName'] || firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          emailVerified: firebaseUser.emailVerified
        };

        this.currentUserSubject.next(user);
      } else {
        this.currentUserSubject.next(null);
      }
      
      if (!this.authStateInitializedSubject.value) {
        this.authStateInitializedSubject.next(true);
      }
    });
  }

  getCurrentUser(): User | null { 
    return this.currentUserSubject.value; 
  }

  isLoggedIn(): boolean { 
    return !!this.getCurrentUser(); 
  }

  getUserId(): string | null { 
    return this.currentUserSubject.value?.uid || null; 
  }

  getUserEmail(): string | null { 
    return this.currentUserSubject.value?.email || null; 
  }
  
  getUserDisplayName(): string {
    const user = this.currentUserSubject.value;
    return user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  }
  
  getUserFirstName(): string {
    return this.getUserDisplayName().split(' ')[0] || 'Usuário';
  }

  async waitForAuthStateInitialized(): Promise<void> {
    if (this.authStateInitializedSubject.value) return;
    await firstValueFrom(this.authStateInitializedSubject);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credential.user;

      const userToSave: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };

      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userRef, userToSave, { merge: true });
      this.currentUserSubject.next(userToSave);

      return { success: true, message: 'Login realizado com sucesso!', user: userToSave };
    } catch (error: any) {
      this.currentUserSubject.next(null);
      return { success: false, message: this.getFirebaseErrorMessage(error) };
    }
  }

  async loginWithGoogle(): Promise<AuthResult> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const credential = await signInWithPopup(this.auth, provider);
      const firebaseUser = credential.user;

      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };

      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userRef, user, { merge: true });
      this.currentUserSubject.next(user);

      return { success: true, message: 'Login com Google realizado com sucesso!', user };
    } catch (error: any) {
      this.currentUserSubject.next(null);
      return { success: false, message: this.getGoogleErrorMessage(error) };
    }
  }

  async register(email: string, password: string, displayName?: string): Promise<AuthResult> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credential.user;

      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: displayName || firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };

      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userRef, user);
      this.currentUserSubject.next(user);

      return { success: true, message: 'Cadastro realizado com sucesso!', user };
    } catch (error: any) {
      this.currentUserSubject.next(null);
      return { success: false, message: this.getFirebaseErrorMessage(error) };
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      if (!rememberMe) {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return { success: true, message: 'Email de recuperação enviado com sucesso!' };
    } catch (error: any) {
      return { success: false, message: this.getFirebaseErrorMessage(error) };
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const result = await this.resetPassword(email);
    if (!result.success) throw new Error(result.message);
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('Usuário não está logado');

    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    const updatedUser = { ...currentUser, ...updates };

    await setDoc(userRef, updatedUser, { merge: true });
    this.currentUserSubject.next(updatedUser);
    return updatedUser;
  }

  checkPasswordStrength(password: string): { score: number; message: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const messages = ['Senha muito fraca', 'Senha muito fraca', 'Senha fraca', 'Senha média', 'Senha forte', 'Senha muito forte'];
    return { score, message: messages[score] };
  }

  private getFirebaseErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Este email já está em uso.',
      'auth/invalid-email': 'Email inválido.',
      'auth/user-not-found': 'Usuário não encontrado. Verifique o email ou crie uma conta.',
      'auth/wrong-password': 'Senha incorreta. Tente novamente.',
      'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
      'auth/missing-password': 'Senha é obrigatória.',
      'auth/network-request-failed': 'Erro de rede. Verifique sua conexão.',
      'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde.',
      'auth/user-disabled': 'Esta conta foi desabilitada.',
      'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.',
      'auth/operation-not-allowed': 'Operação não permitida.',
      'auth/requires-recent-login': 'Esta operação requer login recente.'
    };
    return errorMessages[error.code] || `Erro desconhecido (${error.code}). Tente novamente.`;
  }

  private getGoogleErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
      'auth/popup-blocked': 'Popup bloqueado. Permita popups para este site.',
      'auth/account-exists-with-different-credential': 'Já existe uma conta com este email usando outro método de login.',
      'auth/network-request-failed': 'Erro de rede. Verifique sua conexão.',
      'auth/cancelled-popup-request': 'Solicitação de popup cancelada.',
      'auth/operation-not-allowed': 'Login com Google não está habilitado.'
    };
    return errorMessages[error.code] || 'Erro no login com Google. Tente novamente.';
  }
}