// maintenance.component.ts - Simplified Dark Theme
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MaintenanceService, Maintenance as MaintenanceModel, MaintenanceItem } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './maintenance.html',
  styleUrls: ['./maintenance.css']
})
export class MaintenanceComponent implements OnInit {
  maintenanceForm!: FormGroup;
  maintenances: MaintenanceModel[] = [];
  filteredMaintenances: MaintenanceModel[] = [];
  vehicles: Vehicle[] = [];

  showAddForm = false;
  isLoading = false;
  isLoadingMaintenances = true;
  successMessage = '';
  errorMessage = '';

  selectedVehicleFilter = '';
  selectedTypeFilter = '';
  minDate = '';

  // Estados do modal de exclusão
  showDeleteConfirm = false;
  maintenanceToDelete: MaintenanceModel | null = null;
  isDeleting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadVehicles();
    this.loadMaintenances();
    this.setMinDate();
  }

  private setMinDate(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  private initializeForm(): void {
    this.maintenanceForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, this.dateValidator.bind(this)]],
      items: this.formBuilder.array([this.createItemFormGroup()]),
      notes: ['']
    });

    this.maintenanceForm.get('type')?.valueChanges.subscribe(type => {
      this.onMaintenanceTypeChange(type);
    });
  }

  onMaintenanceTypeChange(type: string): void {
    const dateControl = this.maintenanceForm.get('date');
    if (type === 'agendada') {
      const currentDate = dateControl?.value;
      if (currentDate && currentDate < this.minDate) {
        dateControl?.setValue('');
        this.showTemporaryMessage('Para manutenções agendadas, selecione uma data atual ou futura');
      }
    }
    dateControl?.updateValueAndValidity();
  }

  dateValidator(control: any): { [key: string]: any } | null {
    const type = this.maintenanceForm?.get('type')?.value;
    const selectedDate = control.value;

    if (!selectedDate || !type) return null;

    if (type === 'agendada' && selectedDate < this.minDate) {
      return { 'pastDate': true };
    }
    return null;
  }

  getMinDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'agendada' ? this.minDate : '';
  }

  getMaxDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'realizada' ? this.minDate : '';
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

    switch (type) {
      case 'agendada':
        if (date) {
          const selectedDate = new Date(date);
          const today = new Date();
          const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 7) return '⚡ Manutenção próxima - Não esqueça de se preparar!';
          if (diffDays > 365) return '⚠️ Data muito distante - Confirme se está correto';
          return '📅 Manutenção agendada com sucesso';
        }
        return 'Selecione uma data atual ou futura para a manutenção';
      case 'realizada':
        if (date) {
          const selectedDate = new Date(date);
          const today = new Date();
          return selectedDate.toDateString() === today.toDateString() 
            ? '✅ Manutenção realizada hoje' 
            : '📋 Manutenção registrada no histórico';
        }
        return 'Selecione a data em que a manutenção foi realizada';
      default:
        return 'Selecione primeiro o tipo de manutenção';
    }
  }

  private showTemporaryMessage(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 4000);
  }

  validateMaintenanceDate(): boolean {
    const type = this.maintenanceForm.get('type')?.value;
    const date = this.maintenanceForm.get('date')?.value;

    if (!type || !date) return false;
    if (type === 'agendada' && date < this.minDate) {
      this.errorMessage = 'Manutenções agendadas não podem ser marcadas para datas passadas';
      return false;
    }
    return true;
  }

  private createItemFormGroup(): FormGroup {
    return this.formBuilder.group({
      description: ['', Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get itemsFormArray(): FormArray {
    return this.maintenanceForm.get('items') as FormArray;
  }

  getItemsControls() {
    return this.itemsFormArray.controls;
  }

  addItem(): void {
    this.itemsFormArray.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  calculateTotal(): number {
    const items = this.maintenanceForm.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  async loadMaintenances(): Promise<void> {
    try {
      this.isLoadingMaintenances = true;
      this.maintenances = await this.maintenanceService.getUserMaintenances();
      this.filterMaintenances();
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
      this.errorMessage = 'Erro ao carregar manutenções';
    } finally {
      this.isLoadingMaintenances = false;
    }
  }

  filterMaintenances(): void {
    let filtered = [...this.maintenances];

    if (this.selectedVehicleFilter) {
      filtered = filtered.filter(m => m.vehicleId === this.selectedVehicleFilter);
    }

    if (this.selectedTypeFilter) {
      filtered = filtered.filter(m => m.type === this.selectedTypeFilter);
    }

    this.filteredMaintenances = filtered;
  }

  async onSubmit(): Promise<void> {
    if (this.maintenanceForm.valid && this.validateMaintenanceDate()) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const formValue = this.maintenanceForm.value;
        const selectedVehicle = this.vehicles.find(v => v.id === formValue.vehicleId);
        
        if (!selectedVehicle) {
          this.errorMessage = 'Veículo não encontrado';
          return;
        }

        const validItems: MaintenanceItem[] = formValue.items
          .filter((item: any) => item.description && item.description.trim())
          .map((item: any) => ({
            description: item.description.trim(),
            cost: Number(item.cost) || 0
          }));

        if (validItems.length === 0) {
          this.errorMessage = 'Adicione pelo menos um item válido';
          return;
        }

        const totalCost = validItems.reduce((sum, item) => sum + item.cost, 0);
        const [year, month, day] = formValue.date.split('-').map(Number);
        const correctDate = new Date(year, month - 1, day, 12, 0, 0, 0);

        const maintenance: Omit<MaintenanceModel, 'id' | 'userId' | 'createdAt'> = {
          vehicleId: formValue.vehicleId,
          vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})`,
          type: formValue.type,
          date: correctDate,
          title: formValue.title.trim(),
          items: validItems,
          totalCost: totalCost,
          notes: formValue.notes?.trim() || ''
        };

        const result = await this.maintenanceService.addMaintenance(maintenance);

        if (result.success) {
          this.successMessage = result.message;
          this.resetForm();
          this.showAddForm = false;
          await this.loadMaintenances();
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
        console.error('Erro ao salvar manutenção:', error);
        this.errorMessage = 'Erro inesperado ao salvar manutenção';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.maintenanceForm);
      if (!this.validateMaintenanceDate()) {
        // Mensagem já definida no validateMaintenanceDate
      } else {
        this.errorMessage = 'Por favor, corrija os erros no formulário';
      }
    }
  }

  showDeleteModal(maintenance: MaintenanceModel): void {
    this.maintenanceToDelete = maintenance;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.maintenanceToDelete = null;
    this.isDeleting = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.maintenanceToDelete?.id) return;
    
    this.isDeleting = true;
    try {
      const result = await this.maintenanceService.deleteMaintenance(this.maintenanceToDelete.id);
      if (result.success) {
        this.successMessage = result.message;
        this.showDeleteConfirm = false;
        this.maintenanceToDelete = null;
        await this.loadMaintenances();
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      console.error('Erro ao deletar manutenção:', error);
      this.errorMessage = 'Erro ao deletar manutenção';
    } finally {
      this.isDeleting = false;
    }
  }

  async deleteMaintenance(maintenanceId: string): Promise<void> {
    // Método mantido para compatibilidade, mas agora usa o modal
    const maintenance = this.maintenances.find(m => m.id === maintenanceId);
    if (maintenance) {
      this.showDeleteModal(maintenance);
    }
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  private resetForm(): void {
    this.maintenanceForm.reset();
    this.initializeForm();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }

      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.maintenanceForm.get(fieldName);
    if (fieldName === 'date') {
      const hasBasicError = !!(field && field.invalid && (field.dirty || field.touched));
      const hasPastDateError = !!(field?.errors?.['pastDate']);
      return hasBasicError || hasPastDateError;
    }
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}