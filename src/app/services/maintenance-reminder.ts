//maintenance-reminder.ts 
import { Injectable } from '@angular/core';
import { MaintenanceService, Maintenance } from './maintenance';
import { EmailService } from './email';
import { AuthService } from './auth';

interface ReminderRecord {
  maintenanceId: string;
  threeDaysSent: boolean;
  dayOfSent: boolean;
  lastChecked: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceReminderService {
  private readonly STORAGE_KEY = 'maintenanceReminders';
  private checkInterval: any;

  constructor(
    private maintenanceService: MaintenanceService,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  startReminderSystem(): void {
    this.checkReminders();
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 30 * 60 * 1000);
  }

  stopReminderSystem(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  async checkReminders(): Promise<void> {
    if (!this.authService.isLoggedIn()) return;

    try {
      const maintenances = await this.maintenanceService.getUserMaintenances();
      const scheduledMaintenances = maintenances.filter(m => m.type === 'agendada');
      
      if (scheduledMaintenances.length === 0) return;
      
      for (const maintenance of scheduledMaintenances) {
        await this.processMaintenanceReminder(maintenance);
      }
    } catch (error) {
      // Error handling
    }
  }

  private async processMaintenanceReminder(maintenance: Maintenance): Promise<void> {
    const now = new Date();
    const maintenanceDate = new Date(maintenance.date);
    const daysDiff = this.getDaysDifference(now, maintenanceDate);
    
    const reminderRecord = this.getReminderRecord(maintenance.id!);
    
    if (daysDiff === 3 && !reminderRecord.threeDaysSent) {
      await this.sendThreeDaysReminder(maintenance, reminderRecord);
    }
    
    if (this.shouldSendDayOfReminder(maintenanceDate, now) && !reminderRecord.dayOfSent) {
      await this.sendDayOfReminder(maintenance, reminderRecord);
    }
    
    reminderRecord.lastChecked = now.toISOString();
    this.saveReminderRecord(maintenance.id!, reminderRecord);
  }

  private async sendThreeDaysReminder(maintenance: Maintenance, record: ReminderRecord): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user?.email) return;

    const success = await this.emailService.sendMaintenanceReminder(
      maintenance,
      user.email,
      this.authService.getUserDisplayName()
    );

    if (success) {
      record.threeDaysSent = true;
      this.saveReminderRecord(maintenance.id!, record);
    }
  }

  private async sendDayOfReminder(maintenance: Maintenance, record: ReminderRecord): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user?.email) return;

    const success = await this.emailService.sendMaintenanceReminder(
      maintenance,
      user.email,
      this.authService.getUserDisplayName()
    );

    if (success) {
      record.dayOfSent = true;
      this.saveReminderRecord(maintenance.id!, record);
    }
  }

  private getDaysDifference(from: Date, to: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((toDate.getTime() - fromDate.getTime()) / oneDay);
  }

  private shouldSendDayOfReminder(maintenanceDate: Date, now: Date): boolean {
    const isSameDay = this.isSameDay(maintenanceDate, now);
    const currentHour = now.getHours();
    
    if (isSameDay && currentHour < 8) return true;
    if (isSameDay && currentHour >= 8) return this.wasCreatedToday(maintenanceDate);
    
    return false;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private wasCreatedToday(maintenanceDate: Date): boolean {
    const now = new Date();
    return this.isSameDay(maintenanceDate, now);
  }

  private getReminderRecord(maintenanceId: string): ReminderRecord {
    const records = this.getAllReminderRecords();
    return records[maintenanceId] || {
      maintenanceId,
      threeDaysSent: false,
      dayOfSent: false,
      lastChecked: new Date().toISOString()
    };
  }

  private saveReminderRecord(maintenanceId: string, record: ReminderRecord): void {
    const records = this.getAllReminderRecords();
    records[maintenanceId] = record;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
  }

  private getAllReminderRecords(): { [key: string]: ReminderRecord } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  async forceCheckReminders(): Promise<void> {
    await this.checkReminders();
  }

  async sendTestReminder(): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user?.email) return false;

    return await this.emailService.sendTestEmail(user.email, this.authService.getUserDisplayName());
  }

  resetAllReminders(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getReminderStatus(): any {
    const records = this.getAllReminderRecords();
    return {
      totalRecords: Object.keys(records).length,
      emailConfigured: this.emailService.isConfigured(),
      userLoggedIn: this.authService.isLoggedIn(),
      systemRunning: !!this.checkInterval
    };
  }
}