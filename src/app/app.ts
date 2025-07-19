// src/app/app.component.ts - ATUALIZADO COM SISTEMA DE LEMBRETES
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
  title = 'minha-garagem';

  constructor(
    private authService: AuthService,
    private reminderService: MaintenanceReminderService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Aplicação Minha Garagem iniciada');
    
    // Aguardar inicialização do estado de autenticação
    this.authService.waitForAuthStateInitialized().then(() => {
      this.initializeServices();
    });
  }

  ngOnDestroy(): void {
    // Parar sistema de lembretes ao destruir a aplicação
    this.reminderService.stopReminderSystem();
  }

  private async initializeServices(): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      
      if (user) {
        console.log('👤 Usuário logado:', user.email);
        
        // Verificar configuração do email
        const emailStatus = this.emailService.getConfigurationStatus();
        console.log('📧 Status do EmailJS:', emailStatus);
        
        if (emailStatus.isConfigured && emailStatus.isInitialized) {
          console.log('✅ EmailJS configurado corretamente');
          
          // Iniciar sistema de lembretes
          this.reminderService.startReminderSystem();
          console.log('🔔 Sistema de lembretes iniciado');
          
          // Fazer uma verificação inicial após 5 segundos
          setTimeout(() => {
            this.reminderService.forceCheckReminders();
          }, 5000);
          
        } else {
          console.warn('⚠️ EmailJS não configurado - Lembretes desabilitados');
          console.log('📝 Para habilitar lembretes, configure suas chaves do EmailJS no email.service.ts');
        }
        
      } else {
        console.log('👤 Usuário não logado - Serviço de email não iniciado');
      }
      
    } catch (error) {
      console.error('❌ Erro ao inicializar serviços:', error);
    }
  }

  // Método para reinicializar sistema de lembretes (caso necessário)
  reinitializeReminderSystem(): void {
    console.log('🔄 Reinicializando sistema de lembretes...');
    this.reminderService.stopReminderSystem();
    
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        this.reminderService.startReminderSystem();
        console.log('✅ Sistema de lembretes reinicializado');
      }
    }, 1000);
  }
}