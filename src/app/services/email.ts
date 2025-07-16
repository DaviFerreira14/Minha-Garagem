// src/app/services/email.ts - VERSÃO COMPLETA CORRIGIDA
import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { Maintenance } from './maintenance';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  
  // SUAS CHAVES DO EMAILJS
  private serviceId = 'service_9whkq7j';     
  private templateId = 'template_6qrvxpv';    
  private publicKey = 'lAqb6B3bzGcEnul-W';    

  constructor() {
    // Inicializar EmailJS
    emailjs.init(this.publicKey);
    console.log('📧 EmailJS inicializado');
  }

  // Enviar lembrete de manutenção
  async sendMaintenanceReminder(
    maintenance: Maintenance, 
    userEmail: string, 
    userName: string
  ): Promise<boolean> {
    try {
      // Função para formatar data corretamente
      const formatDateCorrectly = (date: Date): string => {
        // Garantir que estamos trabalhando com o fuso horário local
        const localDate = new Date(date);
        const day = String(localDate.getDate()).padStart(2, '0');
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const year = localDate.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        maintenance_title: maintenance.title,
        vehicle_name: maintenance.vehicleName,
        maintenance_date: formatDateCorrectly(maintenance.date),
        total_cost: maintenance.totalCost.toFixed(2),
        items_list: this.formatItemsList(maintenance.items), // ← MÉTODO CORRIGIDO
        notes: maintenance.notes || 'Nenhuma observação especial',
        current_year: new Date().getFullYear()
      };

      console.log('📤 Enviando email para manutenção:', {
        title: maintenance.title,
        date: templateParams.maintenance_date,
        vehicle: maintenance.vehicleName
      });

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      console.log('✅ Email enviado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  // MÉTODO FORMATITEMSLIST - CORRIGIDO E ADICIONADO
  private formatItemsList(items: any[]): string {
    if (!items || items.length === 0) {
      return 'Nenhum item especificado';
    }
    
    return items.map(item => 
      `• ${item.description} - R$ ${item.cost.toFixed(2)}`
    ).join('\n');
  }

  // Enviar email de teste
  async sendTestEmail(email: string, name: string): Promise<boolean> {
    try {
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      const templateParams = {
        to_email: email,
        to_name: name,
        maintenance_title: 'Teste do Sistema',
        vehicle_name: 'Honda Civic 2020 (Teste)',
        maintenance_date: formattedDate,
        total_cost: '150.00',
        items_list: '• Teste de envio de email - R$ 150,00',
        notes: 'Este é um email de teste para verificar se o sistema está funcionando.',
        current_year: new Date().getFullYear()
      };

      await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      console.log('✅ Email de teste enviado');
      return true;
    } catch (error) {
      console.error('❌ Erro no email de teste:', error);
      return false;
    }
  }

  // Verificar se EmailJS está configurado
  isConfigured(): boolean {
    // Verificar se as chaves não estão vazias e não são os valores padrão antigos
    const isServiceIdValid = Boolean(this.serviceId && 
                                    this.serviceId !== 'YOUR_SERVICE_ID' && 
                                    this.serviceId.startsWith('service_'));
    
    const isTemplateIdValid = Boolean(this.templateId && 
                                     this.templateId !== 'YOUR_TEMPLATE_ID' && 
                                     this.templateId.startsWith('template_'));
    
    const isPublicKeyValid = Boolean(this.publicKey && 
                                    this.publicKey !== 'YOUR_PUBLIC_KEY' && 
                                    this.publicKey.length > 10);

    const configured = isServiceIdValid && isTemplateIdValid && isPublicKeyValid;
    
    return configured;
  }

  // Método para debug (opcional)
  getConfigurationStatus(): any {
    return {
      serviceId: this.serviceId,
      templateId: this.templateId,
      publicKey: this.publicKey.substring(0, 10) + '...',
      isConfigured: this.isConfigured()
    };
  }
}