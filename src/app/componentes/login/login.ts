// login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  authService: any;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password, rememberMe } = this.loginForm.value;

      // Simular chamada de API
      setTimeout(() => {
        // Aqui você implementaria a lógica de autenticação real
        // Por enquanto, vamos simular um login de sucesso
        if (email === 'admin@minhagaragem.com' && password === '123456') {
          // Login bem-sucedido
          if (rememberMe) {
            localStorage.setItem('rememberUser', 'true');
          }
          
          // Redirecionar para o dashboard
          this.router.navigate(['/dashboard']);
        } else {
          // Login falhou
          this.errorMessage = 'Email ou senha incorretos. Tente novamente.';
        }
        
        this.isLoading = false;
      }, 1500);
    } else {
      // Marcar todos os campos como touched para exibir erros
      this.markFormGroupTouched(this.loginForm);
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

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  // Getter para facilitar o acesso aos controles do formulário no template
  get f() {
    return this.loginForm.controls;
  }

  async forgotPassword(): Promise<void> {
  const email = this.loginForm.get('email')?.value;
  
  if (!email) {
    this.errorMessage = 'Digite seu email para recuperar a senha.';
    return;
  }

  this.isLoading = true;
  
  try {
    const result = await this.authService.resetPassword(email);
    
    if (result.success) {
      alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } else {
      this.errorMessage = result.message;
    }
  } catch (error) {
    this.errorMessage = 'Erro ao enviar email de recuperação.';
  } finally {
    this.isLoading = false;
  }
}
}