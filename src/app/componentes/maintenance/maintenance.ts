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
  // Propriedades consolidadas
  maintenanceForm!: FormGroup;
  editForm!: FormGroup;
  maintenances: MaintenanceModel[] = [];
  filteredMaintenances: MaintenanceModel[] = [];
  vehicles: Vehicle[] = [];

  // Estados da UI
  showAddForm = false;
  showEditForm = false;
  showDeleteConfirm = false;
  
  // Estados de loading
  isLoading = false;
  isLoadingMaintenances = true;
  isUpdating = false;
  isDeleting = false;

  // Mensagens e filtros
  successMessage = '';
  errorMessage = '';
  selectedVehicleFilter = '';
  selectedTypeFilter = '';

  // Objetos temporários
  maintenanceToDelete: MaintenanceModel | null = null;
  maintenanceToEdit: MaintenanceModel | null = null;
  
  // Data mínima calculada
  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private reminderService: MaintenanceReminderService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadData();
    this.reminderService.startReminderSystem();
  }

  ngOnDestroy(): void {
    this.reminderService.stopReminderSystem();
  }

  // Inicialização consolidada
  private initializeForms(): void {
    // Formulário principal
    this.maintenanceForm = this.createMaintenanceForm();
    this.maintenanceForm.get('type')?.valueChanges.subscribe(type => 
      this.onTypeChange(type, this.maintenanceForm, false)
    );

    // Formulário de edição
    this.editForm = this.createMaintenanceForm();
    this.editForm.get('type')?.valueChanges.subscribe(type => 
      this.onTypeChange(type, this.editForm, true)
    );
  }

  private createMaintenanceForm(): FormGroup {
    return this.formBuilder.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, (control: any) => this.dateValidator(control)]],
      items: this.formBuilder.array([this.createItemFormGroup()]),
      notes: ['']
    });
  }

  private async loadData(): Promise<void> {
    try {
      await Promise.all([this.loadVehicles(), this.loadMaintenances()]);
    } catch (error) {
      this.errorMessage = 'Erro ao carregar dados';
    }
  }

  // Validação consolidada de data
  private dateValidator = (control: any): { [key: string]: any } | null => {
    const form = control.parent;
    if (!form) return null;
    
    const type = form.get('type')?.value;
    const selectedDate = control.value;
    
    if (!selectedDate || !type) return null;
    if (type === 'agendada' && selectedDate < this.minDate) {
      return { 'pastDate': true };
    }
    return null;
  }

  // Manipulação de tipo consolidada
  private onTypeChange(type: string, form: FormGroup, isEdit: boolean): void {
    const dateControl = form.get('date');
    if (type === 'agendada') {
      const currentDate = dateControl?.value;
      if (currentDate && currentDate < this.minDate) {
        dateControl?.setValue('');
        this.showTemporaryMessage('Para manutenções agendadas, selecione uma data atual ou futura');
      }
    }
    dateControl?.updateValueAndValidity();
  }

  // Métodos de validação consolidados
  getMinDate(isEdit = false): string {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const type = form?.get('type')?.value;
    return type === 'agendada' ? this.minDate : '';
  }

  getMaxDate(isEdit = false): string {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const type = form?.get('type')?.value;
    return type === 'realizada' ? this.minDate : '';
  }

  getDateErrorMessage(isEdit = false): string {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const dateControl = form.get('date');
    if (!dateControl?.errors) return '';

    if (dateControl.errors['required']) return 'Selecione uma data';
    if (dateControl.errors['pastDate']) return 'Manutenções agendadas não podem ser marcadas para datas passadas';
    return '';
  }

  getDateHelperText(isEdit = false): string {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const type = form.get('type')?.value;
    const date = form.get('date')?.value;

    if (!type) return 'Selecione primeiro o tipo de manutenção';

    if (type === 'agendada') {
      if (!date) return 'Selecione uma data atual ou futura para a manutenção';
      
      const selectedDate = new Date(date);
      const today = new Date();
      const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) return '⚡ Manutenção próxima - Você receberá lembretes por email!';
      if (diffDays > 365) return '⚠️ Data muito distante - Confirme se está correto';
      return '📅 Manutenção agendada - Lembretes automáticos ativados!';
    }

    if (type === 'realizada') {
      if (!date) return 'Selecione a data em que a manutenção foi realizada';
      
      const selectedDate = new Date(date);
      const today = new Date();
      return selectedDate.toDateString() === today.toDateString() 
        ? '✅ Manutenção realizada hoje' 
        : '📋 Manutenção registrada no histórico';
    }

    return '';
  }

  // Métodos de item consolidados
  private createItemFormGroup(): FormGroup {
    return this.formBuilder.group({
      description: ['', Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  getItemsControls(isEdit = false) {
    const formArray = isEdit ? this.editForm.get('items') as FormArray : this.maintenanceForm.get('items') as FormArray;
    return formArray.controls;
  }

  addItem(isEdit = false): void {
    const formArray = isEdit ? this.editForm.get('items') as FormArray : this.maintenanceForm.get('items') as FormArray;
    formArray.push(this.createItemFormGroup());
  }

  removeItem(index: number, isEdit = false): void {
    const formArray = isEdit ? this.editForm.get('items') as FormArray : this.maintenanceForm.get('items') as FormArray;
    if (formArray.length > 1) {
      formArray.removeAt(index);
    }
  }

  calculateTotal(isEdit = false): number {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const items = form.get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (Number(item.cost) || 0), 0);
  }

  // Carregamento de dados
  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  private async loadMaintenances(): Promise<void> {
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

  // Operações CRUD consolidadas
  async onSubmit(isEdit = false): Promise<void> {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    
    if (!form.valid || !this.validateDate(isEdit)) {
      this.markFormGroupTouched(form);
      if (this.validateDate(isEdit)) {
        this.errorMessage = 'Por favor, corrija os erros no formulário';
      }
      return;
    }

    const loadingProp = isEdit ? 'isUpdating' : 'isLoading';
    this[loadingProp] = true;
    this.clearMessages();

    try {
      const maintenanceData = await this.buildMaintenanceData(form);
      if (!maintenanceData) return;

      let result;
      if (isEdit && this.maintenanceToEdit?.id) {
        result = await this.maintenanceService.updateMaintenance(this.maintenanceToEdit.id, maintenanceData);
      } else {
        result = await this.maintenanceService.addMaintenance(maintenanceData);
      }

      if (result.success) {
        this.handleSuccessfulSubmit(result.message, form.value.type, isEdit);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = `Erro inesperado ao ${isEdit ? 'atualizar' : 'salvar'} manutenção`;
    } finally {
      this[loadingProp] = false;
    }
  }

  private async buildMaintenanceData(form: FormGroup) {
    const formValue = form.value;
    const selectedVehicle = this.vehicles.find(v => v.id === formValue.vehicleId);
    
    if (!selectedVehicle) {
      this.errorMessage = 'Veículo não encontrado';
      return null;
    }

    const validItems: MaintenanceItem[] = formValue.items
      .filter((item: any) => item.description && item.description.trim())
      .map((item: any) => ({
        description: item.description.trim(),
        cost: Number(item.cost) || 0
      }));

    if (validItems.length === 0) {
      this.errorMessage = 'Adicione pelo menos um item válido';
      return null;
    }

    const [year, month, day] = formValue.date.split('-').map(Number);
    const correctDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    return {
      vehicleId: formValue.vehicleId,
      vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})`,
      type: formValue.type,
      date: correctDate,
      title: formValue.title.trim(),
      items: validItems,
      totalCost: validItems.reduce((sum, item) => sum + item.cost, 0),
      notes: formValue.notes?.trim() || ''
    };
  }

  private handleSuccessfulSubmit(message: string, type: string, isEdit: boolean): void {
    if (type === 'agendada') {
      this.successMessage = `${message} ${isEdit ? 'Dados atualizados com sucesso!' : 'Você receberá lembretes por email 3 dias antes e no dia da manutenção.'}`;
    } else {
      this.successMessage = isEdit ? `${message} Dados atualizados com sucesso!` : message;
    }
    
    if (isEdit) {
      this.cancelEdit();
    } else {
      this.cancelAdd();
    }
    
    this.loadMaintenances();
    
    if (type === 'agendada') {
      setTimeout(() => this.reminderService.forceCheckReminders(), 2000);
    }
  }

  async markAsCompleted(maintenance: MaintenanceModel): Promise<void> {
    if (maintenance.type !== 'agendada') return;

    this.isUpdating = true;
    try {
      const result = await this.maintenanceService.updateMaintenance(maintenance.id!, {
        type: 'realizada' as const,
        date: new Date()
      });
      
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

  // Operações de modal consolidadas
  showEditModal(maintenance: MaintenanceModel): void {
    this.maintenanceToEdit = maintenance;
    this.showEditForm = true;
    this.populateEditForm(maintenance);
  }

  private populateEditForm(maintenance: MaintenanceModel): void {
    const itemsArray = this.editForm.get('items') as FormArray;
    itemsArray.clear();

    maintenance.items.forEach(item => {
      itemsArray.push(this.formBuilder.group({
        description: [item.description, Validators.required],
        cost: [item.cost, [Validators.required, Validators.min(0)]]
      }));
    });

    this.editForm.patchValue({
      vehicleId: maintenance.vehicleId,
      type: maintenance.type,
      title: maintenance.title,
      date: new Date(maintenance.date).toISOString().split('T')[0],
      notes: maintenance.notes || ''
    });
  }

  showDeleteModal(maintenance: MaintenanceModel): void {
    this.maintenanceToDelete = maintenance;
    this.showDeleteConfirm = true;
  }

  async confirmDelete(): Promise<void> {
    if (!this.maintenanceToDelete?.id) return;
    
    this.isDeleting = true;
    try {
      const result = await this.maintenanceService.deleteMaintenance(this.maintenanceToDelete.id);
      if (result.success) {
        this.successMessage = result.message;
        this.cancelDelete();
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

  // Métodos de cancelamento consolidados
  cancelAdd(): void {
    this.showAddForm = false;
    this.resetForm(this.maintenanceForm);
    this.clearMessages();
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.maintenanceToEdit = null;
    this.clearMessages();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.maintenanceToDelete = null;
    this.isDeleting = false;
  }

  // Métodos utilitários consolidados
  private validateDate(isEdit = false): boolean {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const type = form.get('type')?.value;
    const date = form.get('date')?.value;

    if (!type || !date) return false;
    
    if (type === 'agendada' && (!isEdit || this.maintenanceToEdit?.type === 'agendada') && date < this.minDate) {
      this.errorMessage = 'Manutenções agendadas não podem ser marcadas para datas passadas';
      return false;
    }
    return true;
  }

  private resetForm(form: FormGroup): void {
    form.reset();
    const itemsArray = form.get('items') as FormArray;
    itemsArray.clear();
    itemsArray.push(this.createItemFormGroup());
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showTemporaryMessage(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 4000);
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

  isFieldInvalid(fieldName: string, isEdit = false): boolean {
    const form = isEdit ? this.editForm : this.maintenanceForm;
    const field = form.get(fieldName);
    
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

  // Getters para compatibilidade com template
  get itemsFormArray(): FormArray { return this.maintenanceForm.get('items') as FormArray; }
  get editItemsFormArray(): FormArray { return this.editForm.get('items') as FormArray; }
  getEditItemsControls() { return this.getItemsControls(true); }
  addEditItem(): void { this.addItem(true); }
  removeEditItem(index: number): void { this.removeItem(index, true); }
  calculateEditTotal(): number { return this.calculateTotal(true); }
  getEditMinDate(): string { return this.getMinDate(true); }
  getEditMaxDate(): string { return this.getMaxDate(true); }
  getEditDateErrorMessage(): string { return this.getDateErrorMessage(true); }
  getEditDateHelperText(): string { return this.getDateHelperText(true); }
  isEditFieldInvalid(fieldName: string): boolean { return this.isFieldInvalid(fieldName, true); }
  async onEditSubmit(): Promise<void> { return this.onSubmit(true); }
}