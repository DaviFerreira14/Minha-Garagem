import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './services/notification';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container">
      <!-- Conteúdo principal da aplicação -->
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'minha-garagem';
  
  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Aplicação Minha Garagem iniciada');
    
    // Aguardar um pouco para a aplicação carregar completamente
    setTimeout(() => {
      this.initializeEmailService();
    }, 3000);
  }

  ngOnDestroy(): void {
    // Parar serviço quando app for destruído
    this.notificationService.stopNotificationService();
  }

  private initializeEmailService(): void {
    // Só inicializar se usuário estiver logado
    if (this.authService.isLoggedIn()) {
      console.log('👤 Usuário logado - Iniciando serviço de email');
      this.notificationService.startNotificationService();
    } else {
      console.log('👤 Usuário não logado - Serviço de email não iniciado');
    }
  }
}