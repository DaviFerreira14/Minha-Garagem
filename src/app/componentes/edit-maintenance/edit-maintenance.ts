import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MaintenanceService, Maintenance as MaintenanceModel, MaintenanceItem } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-edit-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './edit-maintenance.html',
  styleUrls: ['../maintenance/maintenance.css']
})
export class EditMaintenance implements OnInit {
  editForm!: FormGroup;
  vehicles: Vehicle[] = [];
  maintenance: MaintenanceModel | null = null;

  isLoading = false;
  isUpdating = false;
  showDeleteConfirm = false;
  isDeleting = false;
  successMessage = '';
  errorMessage = '';
  
  get minDate(): string { return new Date().toISOString().split('T')[0]; }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.loadData();
  }

  private createForm(): void {
    this.editForm = this.fb.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, this.dateValidator.bind(this)]],
      items: this.fb.array([this.createItem()]),
      notes: ['']
    });

    this.editForm.get('type')?.valueChanges.subscribe(type => this.handleTypeChange(type));
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const [vehicles] = await Promise.all([
        firstValueFrom(this.vehicleService.getVehicles()),
        this.loadMaintenance()
      ]);
      this.vehicles = vehicles;
    } catch (error) {
      this.errorMessage = 'Erro ao carregar dados';
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMaintenance(): Promise<void> {
    const id = this.route.snapshot.queryParams['id'];
    if (!id) return this.navigateToList('ID da manutenção não encontrado');

    try {
      const maintenances = await this.maintenanceService.getUserMaintenances();
      this.maintenance = maintenances.find(m => m.id === id) || null;
      
      if (!this.maintenance) return this.navigateToList('Manutenção não encontrada');
      this.populateForm();
    } catch (error) {
      this.errorMessage = 'Erro ao carregar manutenção';
    }
  }

  private navigateToList(message: string): void {
    this.errorMessage = message;
    this.router.navigate(['/maintenance']);
  }

  private populateForm(): void {
    if (!this.maintenance) return;

    const itemsArray = this.editForm.get('items') as FormArray;
    itemsArray.clear();
    this.maintenance.items.forEach(item => itemsArray.push(this.createItem(item)));

    this.editForm.patchValue({
      vehicleId: this.maintenance.vehicleId,
      type: this.maintenance.type,
      title: this.maintenance.title,
      date: new Date(this.maintenance.date).toISOString().split('T')[0],
      notes: this.maintenance.notes || ''
    });
  }

  private dateValidator = (control: any) => {
    const form = control.parent;
    if (!form) return null;
    
    const type = form.get('type')?.value;
    const date = control.value;
    
    return (type === 'agendada' && this.maintenance?.type === 'agendada' && date < this.minDate) 
      ? { 'pastDate': true } : null;
  }

  private handleTypeChange(type: string): void {
    const dateControl = this.editForm.get('date');
    if (type === 'agendada' && this.maintenance?.type === 'agendada') {
      const currentDate = dateControl?.value;
      if (currentDate && currentDate < this.minDate) {
        dateControl?.setValue('');
        this.showMessage('Para manutenções agendadas, selecione uma data atual ou futura', 'error');
      }
    }
    dateControl?.updateValueAndValidity();
  }

  getMinDate(): string {
    const type = this.editForm?.get('type')?.value;
    return type === 'agendada' && this.maintenance?.type === 'agendada' ? this.minDate : '';
  }

  getMaxDate(): string {
    return this.editForm?.get('type')?.value === 'realizada' ? this.minDate : '';
  }

  getDateErrorMessage(): string {
    const dateControl = this.editForm.get('date');
    if (!dateControl?.errors) return '';
    if (dateControl.errors['required']) return 'Selecione uma data';
    if (dateControl.errors['pastDate']) return 'Manutenções agendadas não podem ser marcadas para datas passadas';
    return '';
  }

  getDateHelperText(): string {
    const type = this.editForm.get('type')?.value;
    const date = this.editForm.get('date')?.value;

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
        ? '✅ Manutenção realizada hoje' : '📋 Manutenção registrada no histórico';
    }

    return '';
  }

  private createItem(item?: MaintenanceItem): FormGroup {
    return this.fb.group({
      description: [item?.description || '', Validators.required],
      cost: [item?.cost || 0, [Validators.required, Validators.min(0)]]
    });
  }

  getItemsControls() { return (this.editForm.get('items') as FormArray).controls; }
  
  addItem(): void { (this.editForm.get('items') as FormArray).push(this.createItem()); }
  
  removeItem(index: number): void {
    const formArray = this.editForm.get('items') as FormArray;
    if (formArray.length > 1) formArray.removeAt(index);
  }

  calculateTotal(): number {
    const items = this.editForm.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  async markAsCompleted(): Promise<void> {
    if (!this.maintenance || this.maintenance.type !== 'agendada') return;

    this.isUpdating = true;
    try {
      const result = await this.maintenanceService.updateMaintenance(this.maintenance.id!, {
        type: 'realizada' as const,
        date: new Date()
      });
      
      if (result.success) {
        this.showMessage('Manutenção marcada como realizada!', 'success');
        setTimeout(() => this.router.navigate(['/maintenance']), 2000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao marcar manutenção como realizada';
    } finally {
      this.isUpdating = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.editForm.valid || !this.isValidDate()) {
      this.markAllTouched();
      if (this.isValidDate()) this.errorMessage = 'Por favor, corrija os erros no formulário';
      return;
    }

    this.isUpdating = true;
    this.clearMessages();

    try {
      const data = this.buildMaintenanceData();
      if (!data || !this.maintenance?.id) return;

      const result = await this.maintenanceService.updateMaintenance(this.maintenance.id, data);

      if (result.success) {
        this.showMessage(`${result.message} Dados atualizados com sucesso!`, 'success');
        setTimeout(() => this.router.navigate(['/maintenance']), 2000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro inesperado ao atualizar manutenção';
    } finally {
      this.isUpdating = false;
    }
  }

  private buildMaintenanceData() {
    const form = this.editForm.value;
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

  showDeleteModal(): void { this.showDeleteConfirm = true; }

  async confirmDelete(): Promise<void> {
    if (!this.maintenance?.id) return;
    
    this.isDeleting = true;
    try {
      const result = await this.maintenanceService.deleteMaintenance(this.maintenance.id);
      if (result.success) {
        this.showMessage(result.message, 'success');
        setTimeout(() => this.router.navigate(['/maintenance']), 2000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao deletar manutenção';
    } finally {
      this.isDeleting = false;
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.isDeleting = false;
  }

  goBack(): void { this.router.navigate(['/maintenance']); }

  private isValidDate(): boolean {
    const type = this.editForm.get('type')?.value;
    const date = this.editForm.get('date')?.value;
    if (!type || !date) return false;
    
    if (type === 'agendada' && this.maintenance?.type === 'agendada' && date < this.minDate) {
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
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      control?.markAsTouched();
      if (control instanceof FormArray) {
        control.controls.forEach(c => c instanceof FormGroup && Object.keys(c.controls).forEach(k => c.get(k)?.markAsTouched()));
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    if (fieldName === 'date') {
      return !!(field && field.invalid && (field.dirty || field.touched)) || !!(field?.errors?.['pastDate']);
    }
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}