// login.component.ts - VERSÃO COM REMEMBER ME
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService 
  ) {
    console.log('AuthService injected:', this.authService);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadRememberedCredentials();
    
    // Se já estiver logado, redirecionar
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  private loadRememberedCredentials(): void {
    // Carregar email salvo se existir
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && rememberMe) {
      this.loginForm.patchValue({
        email: rememberedEmail,
        rememberMe: true
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    console.log('Login attempt started');
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password, rememberMe } = this.loginForm.value;
      
      console.log('Attempting login for:', email, 'Remember me:', rememberMe);

      try {
        // Definir persistência antes do login
        await this.authService.setPersistence(rememberMe);
        
        console.log('Calling authService.login...');
        const result = await this.authService.login(email, password);
        console.log('Login result:', result);
        
        if (result.success) {
          // Salvar ou remover credenciais baseado na opção "lembrar-me"
          this.handleRememberMe(email, rememberMe);
          
          console.log('Login successful, redirecting...');
          this.router.navigate(['/dashboard']);
        } else {
          console.log('Login failed:', result.message);
          this.errorMessage = result.message;
        }
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage = 'Erro inesperado. Tente novamente.';
      } finally {
        this.isLoading = false;
      }
    } else {
      console.log('Form is invalid');
      this.markFormGroupTouched(this.loginForm);
    }
  }

  private handleRememberMe(email: string, rememberMe: boolean): void {
    if (rememberMe) {
      // Salvar email e preferência
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberMe', 'true');
      console.log('Credentials saved for remember me');
    } else {
      // Remover credenciais salvas
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
      console.log('Credentials removed from remember me');
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Para Google login, sempre usar persistência local (mais conveniente)
      await this.authService.setPersistence(true);
      
      const result = await this.authService.loginWithGoogle();
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro inesperado. Tente novamente.';
    } finally {
      this.isLoading = false;
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

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  get f() {
    return this.loginForm.controls;
  }
}