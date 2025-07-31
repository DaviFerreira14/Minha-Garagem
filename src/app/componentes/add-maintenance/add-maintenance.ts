import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MaintenanceService, MaintenanceItem } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { MaintenanceReminderService } from '../../services/maintenance-reminder';
import { ExpenseService } from '../../services/expense'; 
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-add-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './add-maintenance.html',
  styleUrls: ['../maintenance/maintenance.css']
})
export class AddMaintenance implements OnInit {
  maintenanceForm!: FormGroup;
  vehicles: Vehicle[] = [];
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  
  get minDate(): string { return new Date().toISOString().split('T')[0]; }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private reminderService: MaintenanceReminderService,
    private expenseService: ExpenseService 
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.loadVehicles();
  }

  private createForm(): void {
    this.maintenanceForm = this.fb.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, this.dateValidator.bind(this)]],
      items: this.fb.array([this.createItem()]),
      notes: ['']
    });

    this.maintenanceForm.get('type')?.valueChanges.subscribe(type => this.handleTypeChange(type));
  }

  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  private dateValidator = (control: any) => {
    const form = control.parent;
    if (!form) return null;
    
    const type = form.get('type')?.value;
    const date = control.value;
    
    return (type === 'agendada' && date < this.minDate) ? { 'pastDate': true } : null;
  }

  private handleTypeChange(type: string): void {
    const dateControl = this.maintenanceForm.get('date');
    if (type === 'agendada') {
      const currentDate = dateControl?.value;
      if (currentDate && currentDate < this.minDate) {
        dateControl?.setValue('');
        this.showMessage('Para manutenções agendadas, selecione uma data atual ou futura', 'error');
      }
    }
    dateControl?.updateValueAndValidity();
  }

  getMinDate(): string {
    return this.maintenanceForm?.get('type')?.value === 'agendada' ? this.minDate : '';
  }

  getMaxDate(): string {
    return this.maintenanceForm?.get('type')?.value === 'realizada' ? this.minDate : '';
  }

  getDateErrorMessage(): string {
    const dateControl = this.maintenanceForm.get('date');
    if (!dateControl?.errors) return '';
    if (dateControl.errors['required']) return 'Selecione uma data';
    if (dateControl.errors['pastDate']) return 'Manutenções agendadas não podem ser marcadas para datas passadas';
    return '';
  }

  getDateHelperText(): string {
    const type = this.maintenanceForm.get('type')?.value;
    const date = this.maintenanceForm.get('date')?.value;

    if (!type) return 'Selecione primeiro o tipo de manutenção';

    if (type === 'agendada') {
      if (!date) return 'Selecione uma data atual ou futura para a manutenção';
      const diffDays = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) return '⚡ Manutenção próxima - Você receberá lembretes por email!';
      if (diffDays > 365) return '⚠️ Data muito distante - Confirme se está correto';
      return '📅 Manutenção agendada - Lembretes automáticos ativados!';
    }

    if (type === 'realizada') {
      if (!date) return 'Selecione a data em que a manutenção foi realizada';
      return new Date(date).toDateString() === new Date().toDateString() 
        ? '✅ Manutenção realizada hoje - Será adicionada automaticamente aos gastos' 
        : '📋 Manutenção registrada no histórico - Será adicionada automaticamente aos gastos';
    }

    return '';
  }

  private createItem(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  getItemsControls() { return (this.maintenanceForm.get('items') as FormArray).controls; }
  
  addItem(): void { (this.maintenanceForm.get('items') as FormArray).push(this.createItem()); }
  
  removeItem(index: number): void {
    const formArray = this.maintenanceForm.get('items') as FormArray;
    if (formArray.length > 1) formArray.removeAt(index);
  }

  calculateTotal(): number {
    const items = this.maintenanceForm.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  async onSubmit(): Promise<void> {
    if (!this.maintenanceForm.valid || !this.isValidDate()) {
      this.markAllTouched();
      if (this.isValidDate()) this.errorMessage = 'Por favor, corrija os erros no formulário';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    try {
      const data = this.buildMaintenanceData();
      if (!data) return;

      const result = await this.maintenanceService.addMaintenance(data);

      if (result.success) {
        if (data.type === 'realizada' && data.totalCost > 0) {
          await this.addMaintenanceAsExpense(data);
        }

        const message = data.type === 'agendada' 
          ? `${result.message} Você receberá lembretes por email 3 dias antes e no dia da manutenção.`
          : data.totalCost > 0 
            ? `${result.message} O gasto de R$ ${data.totalCost.toFixed(2)} foi automaticamente adicionado aos seus gastos.`
            : result.message;
        
        this.showMessage(message, 'success');
        
        if (data.type === 'agendada') {
          setTimeout(() => this.reminderService.forceCheckReminders(), 2000);
        }
        
        setTimeout(() => this.router.navigate(['/maintenance']), 3000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro inesperado ao salvar manutenção';
    } finally {
      this.isLoading = false;
    }
  }

  private async addMaintenanceAsExpense(maintenanceData: any): Promise<void> {
    try {
      const vehicle = this.vehicles.find(v => v.id === maintenanceData.vehicleId);
      if (!vehicle) return;

      const itemsDescription = maintenanceData.items
        .map((item: MaintenanceItem) => item.description)
        .join(', ');

      const expense = {
        vehicleId: maintenanceData.vehicleId,
        vehicleName: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
        category: "maintenance" as const, 
        subcategory: 'preventiva', 
        description: `${maintenanceData.title} - ${itemsDescription}`,
        amount: maintenanceData.totalCost,
        date: maintenanceData.date,
        notes: `Manutenção realizada - ${maintenanceData.notes || 'Registro automático'}`
      };

      await this.expenseService.addExpense(expense);
    } catch (error) {
      console.warn('Erro ao adicionar manutenção aos gastos:', error);
    }
  }

  private buildMaintenanceData() {
    const form = this.maintenanceForm.value;
    const vehicle = this.vehicles.find(v => v.id === form.vehicleId);
    
    if (!vehicle) {
      this.errorMessage = 'Veículo não encontrado';
      return null;
    }

    const items: MaintenanceItem[] = form.items
      .filter((item: any) => item.description?.trim())
      .map((item: any) => ({
        description: item.description.trim(),
        cost: Number(item.cost) || 0
      }));

    if (items.length === 0) {
      this.errorMessage = 'Adicione pelo menos um item válido';
      return null;
    }

    const [year, month, day] = form.date.split('-').map(Number);

    return {
      vehicleId: form.vehicleId,
      vehicleName: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      type: form.type,
      date: new Date(year, month - 1, day, 12, 0, 0, 0),
      title: form.title.trim(),
      items,
      totalCost: items.reduce((sum, item) => sum + item.cost, 0),
      notes: form.notes?.trim() || ''
    };
  }

  private isValidDate(): boolean {
    const type = this.maintenanceForm.get('type')?.value;
    const date = this.maintenanceForm.get('date')?.value;
    if (!type || !date) return false;
    
    if (type === 'agendada' && date < this.minDate) {
      this.errorMessage = 'Manutenções agendadas não podem ser marcadas para datas passadas';
      return false;
    }
    return true;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    if (type === 'success') this.successMessage = message;
    else {
      this.errorMessage = message;
      setTimeout(() => this.errorMessage = '', 4000);
    }
  }

  private markAllTouched(): void {
    Object.keys(this.maintenanceForm.controls).forEach(key => {
      const control = this.maintenanceForm.get(key);
      control?.markAsTouched();
      if (control instanceof FormArray) {
        control.controls.forEach(c => c instanceof FormGroup && Object.keys(c.controls).forEach(k => c.get(k)?.markAsTouched()));
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.maintenanceForm.get(fieldName);
    if (fieldName === 'date') {
      return !!(field && field.invalid && (field.dirty || field.touched)) || !!(field?.errors?.['pastDate']);
    }
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  goBack(): void { this.router.navigate(['/maintenance']); }
}