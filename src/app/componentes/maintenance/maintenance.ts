// maintenance.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MaintenanceService, Maintenance as MaintenanceModel, MaintenanceItem } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { MaintenanceReminderService } from '../../services/maintenance-reminder';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './maintenance.html',
  styleUrls: ['./maintenance.css']
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  maintenanceForm!: FormGroup;
  editForm!: FormGroup;
  maintenances: MaintenanceModel[] = [];
  filteredMaintenances: MaintenanceModel[] = [];
  vehicles: Vehicle[] = [];

  showAddForm = false;
  showEditForm = false;
  isLoading = false;
  isLoadingMaintenances = true;
  isUpdating = false;
  successMessage = '';
  errorMessage = '';

  selectedVehicleFilter = '';
  selectedTypeFilter = '';
  minDate = '';

  showDeleteConfirm = false;
  maintenanceToDelete: MaintenanceModel | null = null;
  maintenanceToEdit: MaintenanceModel | null = null;
  isDeleting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private reminderService: MaintenanceReminderService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeEditForm();
    this.loadVehicles();
    this.loadMaintenances();
    this.setMinDate();
    this.reminderService.startReminderSystem();
  }

  ngOnDestroy(): void {
    this.reminderService.stopReminderSystem();
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

  private initializeEditForm(): void {
    this.editForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, this.editDateValidator.bind(this)]],
      items: this.formBuilder.array([]),
      notes: ['']
    });

    this.editForm.get('type')?.valueChanges.subscribe(type => {
      this.onEditTypeChange(type);
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

  onEditTypeChange(type: string): void {
    const dateControl = this.editForm.get('date');
    if (type === 'agendada' && this.maintenanceToEdit?.type === 'agendada') {
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

  editDateValidator(control: any): { [key: string]: any } | null {
    const type = this.editForm?.get('type')?.value;
    const selectedDate = control.value;

    if (!selectedDate || !type) return null;

    // Se está mudando de agendada para agendada, valida data futura
    if (type === 'agendada' && this.maintenanceToEdit?.type === 'agendada' && selectedDate < this.minDate) {
      return { 'pastDate': true };
    }
    return null;
  }

  getMinDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'agendada' ? this.minDate : '';
  }

  getEditMinDate(): string {
    const type = this.editForm?.get('type')?.value;
    // Se está mudando de agendada para agendada, ou criando nova agendada
    if (type === 'agendada' && this.maintenanceToEdit?.type === 'agendada') {
      return this.minDate;
    }
    return '';
  }

  getMaxDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'realizada' ? this.minDate : '';
  }

  getEditMaxDate(): string {
    const type = this.editForm?.get('type')?.value;
    return type === 'realizada' ? this.minDate : '';
  }

  getDateErrorMessage(): string {
    const dateControl = this.maintenanceForm.get('date');
    if (!dateControl?.errors) return '';

    if (dateControl.errors['required']) return 'Selecione uma data';
    if (dateControl.errors['pastDate']) return 'Manutenções agendadas não podem ser marcadas para datas passadas';
    return '';
  }

  getEditDateErrorMessage(): string {
    const dateControl = this.editForm.get('date');
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
          
          if (diffDays <= 7) return '⚡ Manutenção próxima - Você receberá lembretes por email!';
          if (diffDays > 365) return '⚠️ Data muito distante - Confirme se está correto';
          return '📅 Manutenção agendada - Lembretes automáticos ativados!';
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

  getEditDateHelperText(): string {
    const type = this.editForm.get('type')?.value;
    const date = this.editForm.get('date')?.value;

    switch (type) {
      case 'agendada':
        if (date) {
          const selectedDate = new Date(date);
          const today = new Date();
          const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 7) return '⚡ Manutenção próxima - Você receberá lembretes por email!';
          if (diffDays > 365) return '⚠️ Data muito distante - Confirme se está correto';
          return '📅 Manutenção agendada - Lembretes automáticos ativados!';
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

  validateEditDate(): boolean {
    const type = this.editForm.get('type')?.value;
    const date = this.editForm.get('date')?.value;

    if (!type || !date) return false;
    if (type === 'agendada' && this.maintenanceToEdit?.type === 'agendada' && date < this.minDate) {
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

  get editItemsFormArray(): FormArray {
    return this.editForm.get('items') as FormArray;
  }

  getItemsControls() {
    return this.itemsFormArray.controls;
  }

  getEditItemsControls() {
    return this.editItemsFormArray.controls;
  }

  addItem(): void {
    this.itemsFormArray.push(this.createItemFormGroup());
  }

  addEditItem(): void {
    this.editItemsFormArray.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  removeEditItem(index: number): void {
    if (this.editItemsFormArray.length > 1) {
      this.editItemsFormArray.removeAt(index);
    }
  }

  calculateTotal(): number {
    const items = this.maintenanceForm.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  calculateEditTotal(): number {
    const items = this.editForm.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  async loadMaintenances(): Promise<void> {
    try {
      this.isLoadingMaintenances = true;
      this.maintenances = await this.maintenanceService.getUserMaintenances();
      this.filterMaintenances();
    } catch (error) {
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

  // NOVA FUNCIONALIDADE: Abrir formulário de edição
  showEditModal(maintenance: MaintenanceModel): void {
    this.maintenanceToEdit = maintenance;
    this.showEditForm = true;
    this.populateEditForm(maintenance);
  }

  private populateEditForm(maintenance: MaintenanceModel): void {
    // Limpar array de itens
    while (this.editItemsFormArray.length !== 0) {
      this.editItemsFormArray.removeAt(0);
    }

    // Adicionar itens da manutenção
    maintenance.items.forEach(item => {
      const itemGroup = this.formBuilder.group({
        description: [item.description, Validators.required],
        cost: [item.cost, [Validators.required, Validators.min(0)]]
      });
      this.editItemsFormArray.push(itemGroup);
    });

    // Formatar data para o input
    const dateValue = new Date(maintenance.date);
    const formattedDate = dateValue.toISOString().split('T')[0];

    this.editForm.patchValue({
      vehicleId: maintenance.vehicleId,
      type: maintenance.type,
      title: maintenance.title,
      date: formattedDate,
      notes: maintenance.notes || ''
    });
  }

  // NOVA FUNCIONALIDADE: Marcar como realizada
  async markAsCompleted(maintenance: MaintenanceModel): Promise<void> {
    if (maintenance.type !== 'agendada') return;

    this.isUpdating = true;
    try {
      const today = new Date();
      const updates = {
        type: 'realizada' as const,
        date: today
      };

      const result = await this.maintenanceService.updateMaintenance(maintenance.id!, updates);
      
      if (result.success) {
        this.successMessage = 'Manutenção marcada como realizada!';
        await this.loadMaintenances();
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao marcar manutenção como realizada';
    } finally {
      this.isUpdating = false;
    }
  }

  // NOVA FUNCIONALIDADE: Atualizar manutenção
  async onEditSubmit(): Promise<void> {
    if (this.editForm.valid && this.validateEditDate() && this.maintenanceToEdit) {
      this.isUpdating = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const formValue = this.editForm.value;
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

        const updates = {
          vehicleId: formValue.vehicleId,
          vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})`,
          type: formValue.type,
          date: correctDate,
          title: formValue.title.trim(),
          items: validItems,
          totalCost: totalCost,
          notes: formValue.notes?.trim() || ''
        };

        const result = await this.maintenanceService.updateMaintenance(this.maintenanceToEdit.id!, updates);

        if (result.success) {
          this.successMessage = result.message + ' Dados atualizados com sucesso!';
          this.showEditForm = false;
          this.maintenanceToEdit = null;
          await this.loadMaintenances();
          
          // Se foi marcada como agendada, forçar verificação de lembretes
          if (formValue.type === 'agendada') {
            setTimeout(() => {
              this.reminderService.forceCheckReminders();
            }, 2000);
          }
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
        this.errorMessage = 'Erro inesperado ao atualizar manutenção';
      } finally {
        this.isUpdating = false;
      }
    } else {
      this.markFormGroupTouched(this.editForm);
      if (!this.validateEditDate()) {
        // Mensagem já definida no validateEditDate
      } else {
        this.errorMessage = 'Por favor, corrija os erros no formulário';
      }
    }
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.maintenanceToEdit = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Verificar se manutenção pode ser editada (apenas agendadas)
  canEdit(maintenance: MaintenanceModel): boolean {
    return maintenance.type === 'agendada';
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
          if (formValue.type === 'agendada') {
            this.successMessage = `${result.message} Você receberá lembretes por email 3 dias antes e no dia da manutenção.`;
          } else {
            this.successMessage = result.message;
          }
          
          this.resetForm();
          this.showAddForm = false;
          await this.loadMaintenances();
          
          if (formValue.type === 'agendada') {
            setTimeout(() => {
              this.reminderService.forceCheckReminders();
            }, 2000);
          }
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
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
      this.errorMessage = 'Erro ao deletar manutenção';
    } finally {
      this.isDeleting = false;
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

  isEditFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
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