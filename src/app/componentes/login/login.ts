// login.ts
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
    // Debug para verificar se o serviço foi injetado
    console.log('AuthService injected:', this.authService);
  }

  ngOnInit(): void {
    this.initializeForm();
    
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    console.log('Login attempt started');
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password, rememberMe } = this.loginForm.value;
      
      console.log('Attempting login for:', email);

      try {
        console.log('Calling authService.login...');
        const result = await this.authService.login(email, password);
        console.log('Login result:', result);
        
        if (result.success) {
          console.log('Login successful, redirecting...');
          if (rememberMe) {
            localStorage.setItem('rememberUser', 'true');
          }
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