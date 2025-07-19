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

  startNotificationService(): void {
    if (this.isServiceRunning) return;
    
    this.checkMaintenanceReminders();
    this.checkInterval = setInterval(() => this.checkMaintenanceReminders(), 3600000);
    this.isServiceRunning = true;
  }

  stopNotificationService(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isServiceRunning = false;
  }

  async checkMaintenanceReminders(): Promise<void> {
    try {
      if (!this.emailService.isConfigured()) return;

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.email) return;

      const [todayMaintenances, tomorrowMaintenances] = await Promise.all([
        this.getTodayMaintenances(),
        this.getTomorrowMaintenances()
      ]);

      await Promise.all([
        ...todayMaintenances.map(m => this.sendMaintenanceReminder(m, 'today')),
        ...tomorrowMaintenances.map(m => this.sendMaintenanceReminder(m, 'tomorrow'))
      ]);
    } catch (error) {
      console.error('Erro ao verificar lembretes:', error);
    }
  }

  private async getTodayMaintenances(): Promise<Maintenance[]> {
    try {
      const allMaintenances = await this.maintenanceService.getUserMaintenances();
      const today = this.createLocalDate(new Date());
      
      return allMaintenances.filter(maintenance => {
        if (maintenance.type !== 'agendada') return false;
        const maintenanceDate = this.createLocalDate(new Date(maintenance.date));
        return maintenanceDate.getTime() === today.getTime();
      });
    } catch (error) {
      return [];
    }
  }

  private async getTomorrowMaintenances(): Promise<Maintenance[]> {
    try {
      const allMaintenances = await this.maintenanceService.getUserMaintenances();
      const tomorrow = this.createLocalDate(new Date());
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return allMaintenances.filter(maintenance => {
        if (maintenance.type !== 'agendada') return false;
        const maintenanceDate = this.createLocalDate(new Date(maintenance.date));
        return maintenanceDate.getTime() === tomorrow.getTime();
      });
    } catch (error) {
      return [];
    }
  }

  private createLocalDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private async sendMaintenanceReminder(
    maintenance: Maintenance, 
    type: 'today' | 'tomorrow'
  ): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.email) return;

      const reminderKey = `reminder_${maintenance.id}_${type}_${this.getDateKey()}`;
      if (localStorage.getItem(reminderKey)) return;

      const userName = this.authService.getUserDisplayName();
      const success = await this.emailService.sendMaintenanceReminder(
        maintenance, 
        currentUser.email, 
        userName
      );

      if (success) {
        localStorage.setItem(reminderKey, 'sent');
      }
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
    }
  }

  private getDateKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  private clearOldReminders(): void {
    const reminderKeys = Object.keys(localStorage).filter(key => key.startsWith('reminder_'));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    reminderKeys.forEach(key => {
      const parts = key.split('_');
      if (parts.length >= 4) {
        const [year, month, day] = parts[3].split('-');
        const reminderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (reminderDate < weekAgo) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  getServiceStatus(): { isRunning: boolean; lastCheck: string } {
    this.clearOldReminders();
    return {
      isRunning: this.isServiceRunning,
      lastCheck: new Date().toLocaleString('pt-BR')
    };
  }
}