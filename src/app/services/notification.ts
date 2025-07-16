import { Injectable } from '@angular/core';
import { MaintenanceService, Maintenance } from './maintenance';
import { EmailService } from './email';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private checkInterval: any;
  private isServiceRunning = false;

  constructor(
    private maintenanceService: MaintenanceService,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  // Iniciar serviço de notificações automáticas
  startNotificationService(): void {
    if (this.isServiceRunning) {
      return;
    }

    console.log('🚀 Iniciando serviço de notificações automáticas...');
    
    // Verificar imediatamente
    this.checkMaintenanceReminders();
    
    // Verificar a cada hora (3600000 ms = 1 hora)
    this.checkInterval = setInterval(() => {
      this.checkMaintenanceReminders();
    }, 3600000);

    this.isServiceRunning = true;
    console.log('✅ Serviço de notificações iniciado');
  }

  // Parar serviço de notificações
  stopNotificationService(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isServiceRunning = false;
  }

  // Verificar manutenções que precisam de lembrete
  async checkMaintenanceReminders(): Promise<void> {
    try {
      if (!this.emailService.isConfigured()) {
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        return;
      }

      const todayMaintenances = await this.getTodayMaintenances();
      const tomorrowMaintenances = await this.getTomorrowMaintenances();

      // Enviar lembretes para manutenções de hoje
      for (const maintenance of todayMaintenances) {
        await this.sendMaintenanceReminder(maintenance, 'today');
      }

      // Enviar lembretes para manutenções de amanhã
      for (const maintenance of tomorrowMaintenances) {
        await this.sendMaintenanceReminder(maintenance, 'tomorrow');
      }

    } catch (error) {
      console.error('❌ Erro ao verificar lembretes:', error);
    }
  }

 // CORREÇÃO NO notification.service.ts
// Substitua os métodos getTodayMaintenances e getTomorrowMaintenances:

// Obter manutenções agendadas para hoje
private async getTodayMaintenances(): Promise<Maintenance[]> {
  try {
    const allMaintenances = await this.maintenanceService.getUserMaintenances();
    
    // Criar data de hoje no fuso horário local
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const tomorrowLocal = new Date(todayLocal);
    tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);

    console.log('Verificando manutenções para hoje:', todayLocal.toLocaleDateString('pt-BR'));

    return allMaintenances.filter(maintenance => {
      if (maintenance.type !== 'agendada') return false;
      
      // Converter data da manutenção para objeto Date local
      const maintenanceDate = new Date(maintenance.date);
      const maintenanceDateLocal = new Date(
        maintenanceDate.getFullYear(), 
        maintenanceDate.getMonth(), 
        maintenanceDate.getDate()
      );
      
      const isToday = maintenanceDateLocal.getTime() === todayLocal.getTime();
      
      if (isToday) {
        console.log('Manutenção encontrada para hoje:', maintenance.title, maintenanceDateLocal.toLocaleDateString('pt-BR'));
      }
      
      return isToday;
    });
  } catch (error) {
    console.error('Erro ao buscar manutenções de hoje:', error);
    return [];
  }
}

// Obter manutenções agendadas para amanhã
private async getTomorrowMaintenances(): Promise<Maintenance[]> {
  try {
    const allMaintenances = await this.maintenanceService.getUserMaintenances();
    
    // Criar data de amanhã no fuso horário local
    const today = new Date();
    const tomorrowLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);

    console.log('Verificando manutenções para amanhã:', tomorrowLocal.toLocaleDateString('pt-BR'));

    return allMaintenances.filter(maintenance => {
      if (maintenance.type !== 'agendada') return false;
      
      // Converter data da manutenção para objeto Date local
      const maintenanceDate = new Date(maintenance.date);
      const maintenanceDateLocal = new Date(
        maintenanceDate.getFullYear(), 
        maintenanceDate.getMonth(), 
        maintenanceDate.getDate()
      );
      
      const isTomorrow = maintenanceDateLocal.getTime() === tomorrowLocal.getTime();
      
      if (isTomorrow) {
        console.log('Manutenção encontrada para amanhã:', maintenance.title, maintenanceDateLocal.toLocaleDateString('pt-BR'));
      }
      
      return isTomorrow;
    });
  } catch (error) {
    console.error('Erro ao buscar manutenções de amanhã:', error);
    return [];
  }
}

  // Enviar lembrete de manutenção
  private async sendMaintenanceReminder(
    maintenance: Maintenance, 
    type: 'today' | 'tomorrow'
  ): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        return;
      }

      // Verificar se já foi enviado lembrete hoje
      const reminderKey = `reminder_${maintenance.id}_${type}_${this.getDateKey()}`;
      if (localStorage.getItem(reminderKey)) {
        return;
      }

      const userName = this.authService.getUserDisplayName();

      const success = await this.emailService.sendMaintenanceReminder(
        maintenance, 
        currentUser.email, 
        userName
      );

      if (success) {
        // Marcar como enviado para não enviar duplicado no mesmo dia
        localStorage.setItem(reminderKey, 'sent');
      }

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
    }
  }

  // Gerar chave única para o dia
  private getDateKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  // Limpar lembretes antigos do localStorage (executar automaticamente)
  private clearOldReminders(): void {
    const keys = Object.keys(localStorage);
    const reminderKeys = keys.filter(key => key.startsWith('reminder_'));
    
    reminderKeys.forEach(key => {
      const parts = key.split('_');
      if (parts.length >= 4) {
        const dateKey = parts[3];
        const [year, month, day] = dateKey.split('-');
        const reminderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        if (reminderDate < weekAgo) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Status do serviço
  getServiceStatus(): { isRunning: boolean; lastCheck: string } {
    // Executar limpeza automática quando consultar status
    this.clearOldReminders();
    
    return {
      isRunning: this.isServiceRunning,
      lastCheck: new Date().toLocaleString('pt-BR')
    };
  }
}