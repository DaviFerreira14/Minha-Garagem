import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.detectAndApplySystemTheme();
    
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private detectAndApplySystemTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDark ? 'dark' : 'light';
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
      const titulo = document.querySelector('.register-left-panel h1.fw-bold') as HTMLElement;
      
      if (titulo && body.classList.contains('dark-theme')) {
        titulo.style.setProperty('color', '#ffffff', 'important');
        titulo.style.setProperty('text-shadow', '0 0 8px rgba(0,0,0,0.5)', 'important');
        titulo.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
        
        console.log('Título "Minha Garagem" corrigido para branco no register');
      }
    }, 100);
  }

  private passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword.errors) {
        delete confirmPassword.errors['passwordMismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
      return null;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    console.log('Form submitted!');
    console.log('Form valid:', this.registerForm.valid);
    
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { displayName, email, password } = this.registerForm.value;
      
      console.log('Trying to register:', { displayName, email, password });

      try {
        console.log('Calling authService.register...');
        const result = await this.authService.register(email, password, displayName);
        console.log('Register result:', result);
        
        if (result.success) {
          console.log('Registration successful!'); 
          this.successMessage = result.message;
          
          console.log('Redirecting to dashboard...'); 
          this.router.navigate(['/dashboard']);
        } else {
          console.log('Registration failed:', result.message);
          this.errorMessage = result.message;
        }
      } catch (error) {
        console.error('Error in register:', error);
        this.errorMessage = 'Erro inesperado. Tente novamente.';
      } finally {
        console.log('Stopping loading...'); 
        this.isLoading = false;
      }
    } else {
      console.log('Form is invalid!');
      this.markFormGroupTouched(this.registerForm);
      this.errorMessage = 'Por favor, corrija os erros no formulário.';
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToTerms(): void {
    this.router.navigate(['/terms']);
  }

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  get f() {
    return this.registerForm.controls;
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field?.errors || !field?.touched) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} é obrigatório`;
    if (errors['email']) return 'Email deve ter um formato válido';
    if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} deve ter pelo menos ${errors['minlength'].requiredLength} caracteres`;
    if (errors['passwordMismatch']) return 'Senhas não coincidem';
    
    return 'Campo inválido';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: {[key: string]: string} = {
      'displayName': 'Nome',
      'email': 'Email',
      'password': 'Senha',
      'confirmPassword': 'Confirmação de senha'
    };
    
    return displayNames[fieldName] || fieldName;
  }
}