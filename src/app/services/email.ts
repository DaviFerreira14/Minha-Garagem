// src/app/services/email.ts
import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { Maintenance } from './maintenance';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private serviceId = 'service_9whkq7j';
  private templateId = 'template_6qrvxpv';
  private publicKey = 'lAqb6B3bzGcEnul-W';
  private isInitialized = false;

  constructor() {
    this.initializeEmailJS();
  }

  private async initializeEmailJS(): Promise<void> {
    try {
      if (typeof emailjs === 'undefined') return;
      emailjs.init(this.publicKey);
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
    }
  }

  async sendMaintenanceReminder(maintenance: Maintenance, userEmail: string, userName: string): Promise<boolean> {
    if (!this.isInitialized || !this.isConfigured()) return false;

    try {
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        maintenance_title: maintenance.title,
        vehicle_name: maintenance.vehicleName,
        maintenance_date: this.formatDateForEmail(maintenance.date),
        total_cost: maintenance.totalCost.toFixed(2),
        items_list: this.formatItemsList(maintenance.items),
        notes: maintenance.notes || 'Nenhuma observação especial',
        current_year: new Date().getFullYear()
      };

      const response = await emailjs.send(this.serviceId, this.templateId, templateParams);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async sendTestEmail(email: string, name: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.reinitialize();
      if (!this.isInitialized) return false;
    }

    try {
      const templateParams = {
        to_email: email,
        to_name: name,
        maintenance_title: 'Teste do Sistema de Lembretes',
        vehicle_name: 'Honda Civic 2020 (Teste)',
        maintenance_date: this.formatDateForEmail(new Date()),
        total_cost: '150.00',
        items_list: 'Teste de envio de email - R$ 150,00',
        notes: 'Este é um email de teste para verificar se o sistema está funcionando.',
        current_year: new Date().getFullYear()
      };

      const response = await emailjs.send(this.serviceId, this.templateId, templateParams);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private formatDateForEmail(date: Date): string {
    const localDate = new Date(date);
    const day = String(localDate.getDate()).padStart(2, '0');
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const year = localDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatItemsList(items: any[]): string {
    if (!items || items.length === 0) return 'Nenhum item especificado';
    return items.map(item => `• ${item.description} - R$ ${Number(item.cost).toFixed(2)}`).join('\n');
  }

  isConfigured(): boolean {
    return Boolean(
      this.serviceId && this.serviceId.startsWith('service_') &&
      this.templateId && this.templateId.startsWith('template_') &&
      this.publicKey && this.publicKey.length > 15
    );
  }

  isEmailJSInitialized(): boolean {
    return this.isInitialized;
  }

  getConfigurationStatus(): any {
    return {
      isInitialized: this.isInitialized,
      isConfigured: this.isConfigured(),
      emailJSAvailable: typeof emailjs !== 'undefined'
    };
  }

  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initializeEmailJS();
  }
}