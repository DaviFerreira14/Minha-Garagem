// forgot-password.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup;
  isLoading: boolean = false;
  resendLoading: boolean = false;
  errorMessage: string = '';
  emailSent: boolean = false;
  userEmail: string = '';
  showHelp: boolean = false;
  resendCooldown: number = 0;
  private cooldownInterval?: any;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    
    // Se já estiver logado, redirecionar
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    // Limpar interval se existir
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  private initializeForm(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const email = this.forgotPasswordForm.get('email')?.value;

      try {
        const result = await this.authService.resetPassword(email);
        
        if (result.success) {
          // Email enviado com sucesso
          this.userEmail = email;
          this.emailSent = true;
          this.startResendCooldown();
        } else {
          // Erro ao enviar email
          this.errorMessage = result.message;
        }
      } catch (error) {
        this.errorMessage = 'Erro inesperado. Tente novamente.';
        console.error('Erro ao enviar email de recuperação:', error);
      } finally {
        this.isLoading = false;
      }
    } else {
      // Marcar campos como touched para exibir erros
      this.markFormGroupTouched(this.forgotPasswordForm);
      this.errorMessage = 'Por favor, digite um email válido.';
    }
  }

  async resendEmail(): Promise<void> {
    if (this.resendCooldown > 0) return;

    this.resendLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.resetPassword(this.userEmail);
      
      if (result.success) {
        // Email reenviado com sucesso
        this.startResendCooldown();
        
        // Mostrar mensagem temporária
        const originalText = 'Email reenviado com sucesso!';
        this.errorMessage = ''; // Limpar erro
        
        // Criar uma notificação temporária
        this.showTemporaryMessage(originalText, 'success');
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao reenviar email. Tente novamente.';
      console.error('Erro ao reenviar email:', error);
    } finally {
      this.resendLoading = false;
    }
  }

  private showTemporaryMessage(message: string, type: 'success' | 'error'): void {
    // Aqui você pode implementar uma notificação toast
    // Por enquanto, vamos usar um alert simples
    if (type === 'success') {
      setTimeout(() => {
        alert(message);
      }, 100);
    }
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60; // 60 segundos
    
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      
      if (this.resendCooldown <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = undefined;
      }
    }, 1000);
  }

  getResendButtonText(): string {
    if (this.resendLoading) {
      return 'Reenviando...';
    } else if (this.resendCooldown > 0) {
      return `Aguarde ${this.resendCooldown}s`;
    } else {
      return 'Reenviar Email';
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  backToForm(): void {
    this.emailSent = false;
    this.errorMessage = '';
    this.showHelp = false;
    this.resendCooldown = 0;
    
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = undefined;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Getter para facilitar o acesso aos controles do formulário no template
  get f() {
    return this.forgotPasswordForm.controls;
  }

  // Método para voltar ao formulário (caso queira adicionar um botão)
  editEmail(): void {
    this.backToForm();
  }
}