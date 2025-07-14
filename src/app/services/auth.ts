import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

// Interface para resultado de operações de auth
export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    // Verificar se há usuário logado no localStorage
    this.checkStoredUser();
  }

  // Verificar usuário armazenado
  private checkStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Erro ao carregar usuário do storage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  // Fazer login - versão compatível com seus componentes
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Validações básicas
      if (!email || !password) {
        return {
          success: false,
          message: 'Email e senha são obrigatórios'
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Email inválido'
        };
      }

      // Simular validação de credenciais
      // Aqui você implementaria a lógica real de autenticação
      if (password.length < 6) {
        return {
          success: false,
          message: 'Senha deve ter pelo menos 6 caracteres'
        };
      }

      // Criar usuário (simulação - substitua pela sua lógica)
      const user: User = {
        id: 'user_' + Date.now(),
        email: email,
        displayName: email.split('@')[0],
        emailVerified: true
      };

      this.setCurrentUser(user);

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user: user
      };

    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: 'Erro interno. Tente novamente.'
      };
    }
  }

  // Fazer registro - versão compatível com seus componentes
  async register(email: string, password: string, displayName?: string): Promise<AuthResult> {
    try {
      // Validações básicas
      if (!email || !password) {
        return {
          success: false,
          message: 'Email e senha são obrigatórios'
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Email inválido'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          message: 'Senha deve ter pelo menos 6 caracteres'
        };
      }

      // Verificar se email já existe (simulação)
      const existingUser = localStorage.getItem(`user_${email}`);
      if (existingUser) {
        return {
          success: false,
          message: 'Este email já está cadastrado'
        };
      }

      // Criar novo usuário
      const user: User = {
        id: 'user_' + Date.now(),
        email: email,
        displayName: displayName || email.split('@')[0],
        emailVerified: false
      };

      // Salvar usuário (simulação)
      localStorage.setItem(`user_${email}`, JSON.stringify(user));
      this.setCurrentUser(user);

      return {
        success: true,
        message: 'Cadastro realizado com sucesso!',
        user: user
      };

    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        message: 'Erro interno. Tente novamente.'
      };
    }
  }

  // Reset/recuperar senha - método que estava faltando
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      if (!email) {
        return {
          success: false,
          message: 'Email é obrigatório'
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Email inválido'
        };
      }

      // Verificar se email existe (simulação)
      const existingUser = localStorage.getItem(`user_${email}`);
      if (!existingUser) {
        return {
          success: false,
          message: 'Email não encontrado'
        };
      }

      // Simular envio de email de recuperação
      console.log('Enviando email de recuperação para:', email);
      
      // Aqui você implementaria o envio real do email
      // Por exemplo: enviar para API que envia email

      return {
        success: true,
        message: 'Email de recuperação enviado com sucesso!'
      };

    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return {
        success: false,
        message: 'Erro ao enviar email. Tente novamente.'
      };
    }
  }

  // Método para recuperar senha (alias para resetPassword)
  async forgotPassword(email: string): Promise<void> {
    const result = await this.resetPassword(email);
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  // Validar formato de email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Definir usuário atual
  private setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Obter usuário atual
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Verificar se está logado
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Fazer logout
  async logout(): Promise<void> {
    try {
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  // Atualizar perfil
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não está logado');
      }

      const updatedUser = { ...currentUser, ...updates };
      this.setCurrentUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  // Obter ID do usuário
  getUserId(): string | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  // Obter email do usuário
  getUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user ? user.email : null;
  }

  // Obter nome de exibição
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  }

  // Obter primeiro nome
  getUserFirstName(): string {
    const user = this.getCurrentUser();
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'Usuário';
  }

  // Método para verificar força da senha
  checkPasswordStrength(password: string): { score: number; message: string } {
    let score = 0;
    let message = '';

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        message = 'Senha muito fraca';
        break;
      case 2:
        message = 'Senha fraca';
        break;
      case 3:
        message = 'Senha média';
        break;
      case 4:
        message = 'Senha forte';
        break;
      case 5:
        message = 'Senha muito forte';
        break;
    }

    return { score, message };
  }
}