// src/app/services/auth.ts - VERSÃO COMPLETA E CORRIGIDA
import { Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc
} from '@angular/fire/firestore';

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

  // Adiciona um BehaviorSubject para indicar se o estado de autenticação foi inicializado
  private authStateInitializedSubject = new BehaviorSubject<boolean>(false);
  public authStateInitialized$ = this.authStateInitializedSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    // A inicialização do listener foi movida para ngOnInit
  }

  ngOnInit(): void {
    // Chame o listener de estado de autenticação aqui, após a injeção completa
    this.initAuthStateListener();
  }

  // 🔄 Listener do Firebase Auth para manter usuário logado
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
      // Indica que o estado inicial de autenticação foi processado
      // Isso deve ser chamado APÓS o processamento do firebaseUser ou null.
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

  // Novo método para aguardar a inicialização do estado de autenticação
  async waitForAuthStateInitialized(): Promise<void> {
    if (this.authStateInitializedSubject.value) {
      return; // Já inicializado, retorna imediatamente
    }
    // Aguarda a primeira emissão de 'true' do authStateInitialized$
    await firstValueFrom(this.authStateInitializedSubject);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credential.user;

      // Garantir que o documento do usuário exista no Firestore ao fazer login
      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      const userToSave: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };
      await setDoc(userRef, userToSave, { merge: true });

      // Garante que o BehaviorSubject seja atualizado imediatamente após o login bem-sucedido
      this.currentUserSubject.next(userToSave);

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user: userToSave
      };
    } catch (error: any) {
      this.currentUserSubject.next(null); // Em caso de erro, define como não logado
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error)
      };
    }
  }

  async loginWithGoogle(): Promise<AuthResult> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const firebaseUser = credential.user;

      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };

      // Salvar/Atualizar no Firestore
      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userRef, user, { merge: true }); // Usar merge: true para não sobrescrever dados existentes

      this.currentUserSubject.next(user); // Atualiza o BehaviorSubject

      return {
        success: true,
        message: 'Login com Google realizado com sucesso!',
        user
      };
    } catch (error: any) {
      this.currentUserSubject.next(null); // Em caso de erro, define como não logado
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error)
      };
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
        displayName: displayName || firebaseUser.displayName || '', // Prioriza o displayName fornecido
        photoURL: firebaseUser.photoURL || '',
        emailVerified: firebaseUser.emailVerified
      };

      // Salvar no Firestore
      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userRef, user);

      this.currentUserSubject.next(user); // Atualiza o BehaviorSubject

      return {
        success: true,
        message: 'Cadastro realizado com sucesso!',
        user
      };
    } catch (error: any) {
      this.currentUserSubject.next(null); // Em caso de erro, define como não logado
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error)
      };
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Email de recuperação enviado com sucesso!'
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.getFirebaseErrorMessage(error)
      };
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

  // Métodos que estavam faltando e causando os erros:
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
    const name = this.getUserDisplayName();
    return name.split(' ')[0] || 'Usuário';
  }

  checkPasswordStrength(password: string): { score: number; message: string } {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let message = '';
    switch (score) {
      case 0:
      case 1: message = 'Senha muito fraca'; break;
      case 2: message = 'Senha fraca'; break;
      case 3: message = 'Senha média'; break;
      case 4: message = 'Senha forte'; break;
      case 5: message = 'Senha muito forte'; break;
    }

    return { score, message };
  }

  debugCurrentUser(): void {
    console.log('Usuário atual:', this.getCurrentUser());
  }

  private getFirebaseErrorMessage(error: any): string {
    const code = error.code;

    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Este email já está em uso.',
      'auth/invalid-email': 'Email inválido.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/weak-password': 'Senha muito fraca.',
      'auth/missing-password': 'Senha é obrigatória.',
      'auth/network-request-failed': 'Erro de rede. Verifique sua conexão.'
    };

    return errorMessages[code] || 'Erro desconhecido. Tente novamente.';
  }
}