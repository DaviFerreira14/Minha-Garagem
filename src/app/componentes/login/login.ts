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
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadRememberedCredentials();
    this.detectAndApplySystemTheme();
    
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
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && rememberMe) {
      this.loginForm.patchValue({
        email: rememberedEmail,
        rememberMe: true
      });
    }
  }

  private detectAndApplySystemTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const theme = 'light';
      localStorage.setItem('theme', theme);
      this.applyTheme(theme);
    } else {
      this.applyTheme(savedTheme);
    }
  }

  private applyTheme(theme: string): void {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      this.fixTitleColor();
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }

  private fixTitleColor(): void {
    setTimeout(() => {
      const body = document.body;
      const titulo = document.querySelector('h1.fw-bold.titulo-garagem') as HTMLElement;
      
      if (titulo && body.classList.contains('dark-theme')) {
        titulo.style.setProperty('color', '#ffffff', 'important');
        titulo.style.setProperty('text-shadow', '0 0 8px rgba(0,0,0,0.5)', 'important');
        titulo.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
      }
    }, 100);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password, rememberMe } = this.loginForm.value;

      try {
        await this.authService.setPersistence(rememberMe);
        
        const result = await this.authService.login(email, password);
        
        if (result.success) {
          this.handleRememberMe(email, rememberMe);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
        this.errorMessage = 'Erro inesperado. Tente novamente.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  private handleRememberMe(email: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
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