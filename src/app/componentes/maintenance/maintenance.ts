// src/app/componentes/maintenance/maintenance.ts - VERSÃO COMPLETA E CORRIGIDA
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// Adicione/Verifique essas importações para Firebase Firestore
import { Firestore, doc, getDoc, deleteDoc } from '@angular/fire/firestore'; // <<< Adicionado/Verificado

import { MaintenanceService, Maintenance as MaintenanceModel, MaintenanceItem } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './maintenance.html',
  styleUrls: ['./maintenance.css']
})
export class MaintenanceComponent implements OnInit {
  maintenanceForm!: FormGroup;
  maintenances: MaintenanceModel[] = [];
  filteredMaintenances: MaintenanceModel[] = [];
  vehicles: Vehicle[] = [];

  showAddForm: boolean = false;
  isLoading: boolean = false;
  isLoadingMaintenances: boolean = true;
  successMessage: string = '';
  errorMessage: string = '';

  selectedVehicleFilter: string = '';
  selectedTypeFilter: string = '';

  // Nova propriedade para controlar a data mínima
  minDate: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private firestore: Firestore // <<< VERIFIQUE SE O FIRESTORE ESTÁ INJETADO AQUI
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadVehicles();
    this.loadMaintenances();
    this.setMinDate();
  }

  // Novo método para definir data mínima (hoje)
  private setMinDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  // Modificar o initializeForm para incluir validação
  private initializeForm(): void {
    this.maintenanceForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      type: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', [Validators.required, this.dateValidator.bind(this)]],
      items: this.formBuilder.array([this.createItemFormGroup()]),
      notes: ['']
    });

    // Adicionar listener para mudanças no tipo de manutenção
    this.maintenanceForm.get('type')?.valueChanges.subscribe(type => {
      this.onMaintenanceTypeChange(type);
    });
  }

  // Novo método para reagir à mudança do tipo de manutenção
  onMaintenanceTypeChange(type: string): void {
    const dateControl = this.maintenanceForm.get('date');

    if (type === 'agendada') {
      // Se é agendada, limpar data se for passada
      const currentDate = dateControl?.value;
      if (currentDate && currentDate < this.minDate) {
        dateControl?.setValue('');
        this.showTemporaryMessage('Para manutenções agendadas, selecione uma data atual ou futura', 'warning');
      }

      // Sugestão: próxima semana se não tiver data
      if (!currentDate) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        this.showTemporaryMessage(`Sugestão: ${nextWeek.toLocaleDateString('pt-BR')} (próxima semana)`, 'info');
      }
    } else if (type === 'realizada') {
      // Sugestão: data de hoje se não tiver data
      const currentDate = dateControl?.value;
      if (!currentDate) {
        this.showTemporaryMessage('Sugestão: Use a data de hoje se foi realizada recentemente', 'info');
      }
    }

    // Revalidar o campo data
    dateControl?.updateValueAndValidity();
  }

  // Novo validador customizado para data
  dateValidator(control: any): { [key: string]: any } | null {
    const type = this.maintenanceForm?.get('type')?.value;
    const selectedDate = control.value;

    if (!selectedDate || !type) {
      return null; // Deixa a validação required cuidar de campos vazios
    }

    // Se é manutenção agendada, verificar se a data não é passada
    if (type === 'agendada' && selectedDate < this.minDate) {
      return { 'pastDate': true };
    }

    return null;
  }

  // Método para obter a data mínima baseada no tipo
  getMinDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'agendada' ? this.minDate : '';
  }

  // Método para obter a data máxima (opcional - para manutenções realizadas)
  getMaxDate(): string {
    const type = this.maintenanceForm?.get('type')?.value;
    return type === 'realizada' ? this.minDate : '';
  }

  // Método para verificar se a data é válida
  isDateValid(fieldName: string): boolean {
    const field = this.maintenanceForm.get(fieldName);
    const type = this.maintenanceForm.get('type')?.value;

    if (!field || !type) return true;

    const hasError = field.invalid && (field.dirty || field.touched);
    const hasPastDateError = field.errors?.['pastDate'];

    return !hasError && !hasPastDateError;
  }

  // Método para obter mensagem de erro da data
  getDateErrorMessage(): string {
    const dateControl = this.maintenanceForm.get('date');

    if (!dateControl || !dateControl.errors) return '';

    if (dateControl.errors['required']) {
      return 'Selecione uma data';
    }

    if (dateControl.errors['pastDate']) {
      return 'Manutenções agendadas não podem ser marcadas para datas passadas';
    }

    return '';
  }

  // Método para verificar se a data está próxima (para avisos)
  isDateSoon(dateString: string): boolean {
    if (!dateString) return false;

    const selectedDate = new Date(dateString);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7; // Próximos 7 dias
  }

  // Método para verificar se a data é muito no futuro
  isDateTooFar(dateString: string): boolean {
    if (!dateString) return false;

    const selectedDate = new Date(dateString);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 365; // Mais de 1 ano no futuro
  }

  // Método aprimorado para obter texto de ajuda
  getDateHelperText(): string {
    const type = this.maintenanceForm.get('type')?.value;
    const date = this.maintenanceForm.get('date')?.value;

    switch (type) {
      case 'agendada':
        if (date) {
          if (this.isDateSoon(date)) {
            return '⚡ Manutenção próxima - Não esqueça de se preparar!';
          } else if (this.isDateTooFar(date)) {
            return '⚠️ Data muito distante - Confirme se está correto';
          } else {
            return '📅 Manutenção agendada com sucesso';
          }
        }
        return 'Selecione uma data atual ou futura para a manutenção';
      case 'realizada':
        if (date) {
          const selectedDate = new Date(date);
          const today = new Date();
          if (selectedDate.toDateString() === today.toDateString()) {
            return '✅ Manutenção realizada hoje';
          } else {
            return '📋 Manutenção registrada no histórico';
          }
        }
        return 'Selecione a data em que a manutenção foi realizada';
      default:
        return 'Selecione primeiro o tipo de manutenção';
    }
  }

  // Método para mostrar mensagens temporárias
  private showTemporaryMessage(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
    if (type === 'warning') {
      this.errorMessage = message;
      setTimeout(() => this.errorMessage = '', 4000);
    } else {
      // Para info e success, você pode implementar um sistema de toast/notificação
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  // Método para validação adicional antes do submit
  validateMaintenanceDate(): boolean {
    const type = this.maintenanceForm.get('type')?.value;
    const date = this.maintenanceForm.get('date')?.value;

    if (!type || !date) return false;

    if (type === 'agendada' && date < this.minDate) {
      this.errorMessage = 'Manutenções agendadas não podem ser marcadas para datas passadas';
      return false;
    }

    if (type === 'agendada' && this.isDateTooFar(date)) {
      const confirm = window.confirm('A data selecionada é muito distante. Deseja continuar mesmo assim?');
      if (!confirm) return false;
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

    // Filtrar por veículo
    if (this.selectedVehicleFilter) {
      filtered = filtered.filter(m => m.vehicleId === this.selectedVehicleFilter);
    }

    // Filtrar por tipo
    if (this.selectedTypeFilter) {
      filtered = filtered.filter(m => m.type === this.selectedTypeFilter);
    }

    this.filteredMaintenances = filtered;
  }

  // SEU CÓDIGO CORRIGIDO PARA O SUBMIT (QUE VOCÊ JÁ TINHA ME MANDADO)
  async onSubmit(): Promise<void> {
    if (this.maintenanceForm.valid && this.validateMaintenanceDate()) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const formValue = this.maintenanceForm.value;

        // Encontrar o veículo selecionado
        const selectedVehicle = this.vehicles.find(v => v.id === formValue.vehicleId);
        if (!selectedVehicle) {
          this.errorMessage = 'Veículo não encontrado';
          this.isLoading = false;
          return;
        }

        // Filtrar itens válidos (com descrição)
        const validItems: MaintenanceItem[] = formValue.items
          .filter((item: any) => item.description && item.description.trim())
          .map((item: any) => ({
            description: item.description.trim(),
            cost: Number(item.cost) || 0
          }));

        if (validItems.length === 0) {
          this.errorMessage = 'Adicione pelo menos um item válido';
          this.isLoading = false;
          return;
        }

        // Calcular total
        const totalCost = validItems.reduce((sum, item) => sum + item.cost, 0);

        // CORREÇÃO DE FUSO HORÁRIO: Criar data correta sem conversão UTC
        const dateInput = formValue.date; // String no formato YYYY-MM-DD
        const [year, month, day] = dateInput.split('-').map(Number);

        // Criar data no fuso horário local (evitar conversão UTC)
        const correctDate = new Date(year, month - 1, day, 12, 0, 0, 0); // 12h para evitar problemas de DST

        console.log('Data original do formulário:', dateInput);
        console.log('Data corrigida para salvar:', correctDate);

        // Criar objeto de manutenção
        const maintenance: Omit<MaintenanceModel, 'id' | 'userId' | 'createdAt'> = {
          vehicleId: formValue.vehicleId,
          vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})`,
          type: formValue.type,
          date: correctDate, // ← USANDO A DATA CORRIGIDA
          title: formValue.title.trim(),
          items: validItems,
          totalCost: totalCost,
          notes: formValue.notes?.trim() || ''
        };

        // Salvar no Firebase
        const result = await this.maintenanceService.addMaintenance(maintenance);

        if (result.success) {
          this.successMessage = result.message;
          this.resetForm();
          this.showAddForm = false;
          await this.loadMaintenances(); // Recarregar lista
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
        // A mensagem de erro já foi definida no validateMaintenanceDate
      } else {
        this.errorMessage = 'Por favor, corrija os erros no formulário';
      }
    }
  }


  async deleteMaintenance(maintenanceId: string): Promise<void> {
    if (confirm('Tem certeza que deseja excluir esta manutenção?')) {
      try {
        // Agora o método deleteMaintenance do seu serviço já inclui a verificação de permissão.
        // É melhor usar o serviço para manter a lógica de negócio encapsulada.
        const result = await this.maintenanceService.deleteMaintenance(maintenanceId);

        if (result.success) {
          this.successMessage = result.message;
          await this.loadMaintenances(); // Recarregar lista
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
        console.error('Erro ao deletar manutenção:', error);
        this.errorMessage = 'Erro ao deletar manutenção';
      }
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

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }
}