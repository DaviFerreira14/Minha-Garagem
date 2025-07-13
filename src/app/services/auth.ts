// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.config';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(auth, (user) => {
      this.currentUserSubject.next(user);
      if (user) {
        // Usuário logado
        console.log('Usuário logado:', user.email);
      } else {
        // Usuário deslogado
        console.log('Usuário deslogado');
      }
    });
  }

  // Login com email e senha
  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Login realizado com sucesso:', user.email);
      return { success: true, message: 'Login realizado com sucesso!' };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  // Registro de novo usuário
  async register(email: string, password: string, displayName: string): Promise<{ success: boolean; message: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualizar nome do usuário
      await updateProfile(user, { displayName: displayName });
      
      console.log('Registro realizado com sucesso:', user.email);
      return { success: true, message: 'Conta criada com sucesso!' };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.router.navigate(['/login']);
      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  // Recuperar senha
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Email de recuperação enviado!' };
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  // Verificar se usuário está logado
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Obter usuário atual
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Traduzir códigos de erro do Firebase
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Verifique o email.';
      case 'auth/wrong-password':
        return 'Senha incorreta. Tente novamente.';
      case 'auth/email-already-in-use':
        return 'Este email já está sendo usado por outra conta.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'Email inválido. Verifique o formato.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}