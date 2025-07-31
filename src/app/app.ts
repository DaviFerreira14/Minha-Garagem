import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { MaintenanceReminderService } from './services/maintenance-reminder';
import { EmailService } from './services/email';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private reminderService: MaintenanceReminderService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.authService.waitForAuthStateInitialized().then(() => {
      this.initializeServices();
    });
  }

  ngOnDestroy(): void {
    this.reminderService.stopReminderSystem();
  }

  private async initializeServices(): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      
      if (user) {
        const emailStatus = this.emailService.getConfigurationStatus();
        
        if (emailStatus.isConfigured && emailStatus.isInitialized) {
          this.reminderService.startReminderSystem();
          
          setTimeout(() => {
            this.reminderService.forceCheckReminders();
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar serviços:', error);
    }
  }

  reinitializeReminderSystem(): void {
    this.reminderService.stopReminderSystem();
    
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        this.reminderService.startReminderSystem();
      }
    }, 1000);
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      localStorage.setItem('theme', 'light');
      this.applyTheme('light');
    } else {
      this.applyTheme(savedTheme);
    }
  }

  private applyTheme(theme: string): void {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }
}