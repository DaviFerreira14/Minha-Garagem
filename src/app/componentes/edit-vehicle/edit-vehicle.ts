import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// Serviços
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-edit-vehicle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-vehicle.html',
  styleUrls: ['./edit-vehicle.css']
})
export class EditVehicle implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;

  vehicleForm!: FormGroup;
  vehicle: Vehicle | null = null;
  originalVehicle: Vehicle | null = null;
  
  // Estado do componente
  isLoading = true;
  isSubmitting = false;
  isDragOver = false;
  error: string | null = null;
  
  // Foto
  photoPreview: string | null = null;
  selectedPhoto: File | null = null;
  photoChanged = false;
  
  // Dados auxiliares
  years: number[] = [];
  
  // Subscriptions
  private routeSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.generateYearsList();
    this.initializeForm();
    this.loadVehicleForEdit();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  // Gerar lista de anos
  generateYearsList(): void {
    const currentYear = new Date().getFullYear();
    this.years = [];
    for (let year = currentYear; year >= 1900; year--) {
      this.years.push(year);
    }
  }

  // Inicializar formulário
  initializeForm(): void {
    this.vehicleForm = this.fb.group({
      brand: ['', [Validators.required]],
      model: ['', [Validators.required]],
      year: ['', [Validators.required]],
      licensePlate: ['', [Validators.required]],
      color: ['', [Validators.required]],
      fuel: ['', [Validators.required]],
      mileage: ['', [Validators.required, Validators.min(0)]],
      engineSize: [''],
      transmission: ['', [Validators.required]],
      doors: ['', [Validators.required]],
      observations: ['']
    });
  }

  // Carregar veículo para edição
  private loadVehicleForEdit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const vehicleId = params['id'];
      if (vehicleId) {
        this.loadVehicle(vehicleId);
      } else {
        this.error = 'ID do veículo não fornecido';
        this.isLoading = false;
      }
    });
  }

  // Carregar dados do veículo
  private loadVehicle(vehicleId: string): void {
    try {
      const vehicle = this.vehicleService.getVehicleById(vehicleId);
      
      if (!vehicle) {
        this.error = 'Veículo não encontrado';
        this.isLoading = false;
        return;
      }

      // Verificar se o veículo pertence ao usuário logado
      const currentUserId = this.authService.getUserId();
      if (vehicle.userId !== currentUserId) {
        this.error = 'Você não tem permissão para editar este veículo';
        this.isLoading = false;
        return;
      }

      this.vehicle = vehicle;
      this.originalVehicle = { ...vehicle }; // Cópia para comparação
      this.populateForm();
      this.isLoading = false;

    } catch (error) {
      console.error('Erro ao carregar veículo:', error);
      this.error = 'Erro ao carregar veículo para edição';
      this.isLoading = false;
    }
  }

  // Preencher formulário com dados do veículo
  private populateForm(): void {
    if (!this.vehicle) return;

    this.vehicleForm.patchValue({
      brand: this.vehicle.brand,
      model: this.vehicle.model,
      year: this.vehicle.year,
      licensePlate: this.vehicle.licensePlate,
      color: this.vehicle.color,
      fuel: this.vehicle.fuel,
      mileage: this.vehicle.mileage,
      engineSize: this.vehicle.engineSize || '',
      transmission: this.vehicle.transmission,
      doors: this.vehicle.doors,
      observations: this.vehicle.observations || ''
    });

    // Definir foto atual
    if (this.vehicle.photo) {
      this.photoPreview = this.vehicle.photo;
    }
  }

  // Getter para acessar controles do formulário
  get f() {
    return this.vehicleForm.controls;
  }

  // Verificar se campo tem erro
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.vehicleForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  // Obter erro do campo
  getFieldError(fieldName: string): string {
    const field = this.vehicleForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} é obrigatório`;
      }
      if (field.errors['min']) {
        return `${this.getFieldDisplayName(fieldName)} deve ser maior que ${field.errors['min'].min}`;
      }
    }
    return '';
  }

  // Obter nome de exibição do campo
  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      brand: 'Marca',
      model: 'Modelo',
      year: 'Ano',
      licensePlate: 'Placa',
      color: 'Cor',
      fuel: 'Combustível',
      mileage: 'Quilometragem',
      engineSize: 'Motor',
      transmission: 'Transmissão',
      doors: 'Portas'
    };
    return fieldNames[fieldName] || fieldName;
  }

  // Verificar se houve mudanças
  hasChanges(): boolean {
    if (!this.vehicle || !this.originalVehicle) return false;
    
    const formValues = this.vehicleForm.value;
    
    // Verificar mudanças nos campos do formulário
    const fieldsChanged = 
      formValues.brand !== this.originalVehicle.brand ||
      formValues.model !== this.originalVehicle.model ||
      formValues.year !== this.originalVehicle.year ||
      formValues.licensePlate !== this.originalVehicle.licensePlate ||
      formValues.color !== this.originalVehicle.color ||
      formValues.fuel !== this.originalVehicle.fuel ||
      formValues.mileage !== this.originalVehicle.mileage ||
      formValues.engineSize !== (this.originalVehicle.engineSize || '') ||
      formValues.transmission !== this.originalVehicle.transmission ||
      formValues.doors !== this.originalVehicle.doors ||
      formValues.observations !== (this.originalVehicle.observations || '');
    
    return fieldsChanged || this.photoChanged;
  }

  // Eventos de drag and drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.processImageFile(file);
      }
    }
  }

  // Disparar seleção de arquivo
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // Quando arquivo é selecionado
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.processImageFile(file);
    }
  }

  // Processar arquivo de imagem
  private processImageFile(file: File): void {
    this.selectedPhoto = file;
    this.photoChanged = true;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Alterar foto
  changePhoto(): void {
    this.triggerFileInput();
  }

  // Remover foto
  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    this.photoChanged = true;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Restaurar foto original
  restoreOriginalPhoto(): void {
    this.selectedPhoto = null;
    this.photoChanged = false;
    this.photoPreview = this.originalVehicle?.photo || null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Formatar placa
  formatLicensePlate(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length <= 3) {
      value = value;
    } else if (value.length <= 7) {
      if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3);
      }
    } else {
      value = value.slice(0, 8);
    }

    event.target.value = value;
    this.vehicleForm.get('licensePlate')?.setValue(value);
  }

  // Submeter formulário
  async onSubmit(): Promise<void> {
    if (this.vehicleForm.valid && !this.isSubmitting && this.vehicle) {
      this.isSubmitting = true;
      
      try {
        const formData = this.vehicleForm.value;

        // Processar foto se foi alterada
        let photoBase64 = this.vehicle.photo; // Manter foto original por padrão
        
        if (this.photoChanged) {
          if (this.selectedPhoto) {
            // Nova foto foi selecionada
            photoBase64 = await this.vehicleService.processImageFile(this.selectedPhoto);
          } else {
            // Foto foi removida
            photoBase64 = '';
          }
        }

        // Preparar dados atualizados
        const updatedVehicleData: Partial<Vehicle> = {
          brand: formData.brand,
          model: formData.model,
          year: parseInt(formData.year),
          licensePlate: formData.licensePlate,
          color: formData.color,
          fuel: formData.fuel,
          mileage: parseInt(formData.mileage),
          engineSize: formData.engineSize || '',
          transmission: formData.transmission,
          doors: parseInt(formData.doors),
          observations: formData.observations || '',
          photo: photoBase64
        };

        // Atualizar veículo usando o serviço
        const updatedVehicle = await this.vehicleService.updateVehicle(this.vehicle.id, updatedVehicleData);
        
        console.log('Veículo atualizado com sucesso:', updatedVehicle);
        
        // Mostrar mensagem de sucesso
        this.showSuccessMessage();
        
        // Aguardar um pouco antes de navegar
        setTimeout(() => {
          this.router.navigate(['/vehicles', this.vehicle!.id]);
        }, 1000);
        
      } catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        this.showErrorMessage('Erro ao atualizar veículo. Tente novamente.');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  // Mostrar mensagem de sucesso
  private showSuccessMessage(): void {
    alert('Veículo atualizado com sucesso! Redirecionando...');
  }

  // Mostrar mensagem de erro
  private showErrorMessage(message: string): void {
    alert(message);
  }

  // Marcar todos os campos como tocados
  private markFormGroupTouched(): void {
    Object.keys(this.vehicleForm.controls).forEach(key => {
      const control = this.vehicleForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Cancelar edição
  cancel(): void {
    if (this.hasChanges()) {
      const confirmCancel = confirm(
        'Você tem alterações não salvas. Deseja realmente cancelar?'
      );
      if (!confirmCancel) {
        return;
      }
    }
    
    // Voltar para detalhes do veículo
    if (this.vehicle) {
      this.router.navigate(['/vehicles', this.vehicle.id]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  // Resetar formulário
  resetForm(): void {
    const confirmReset = confirm(
      'Deseja resetar o formulário para os valores originais?'
    );
    
    if (confirmReset) {
      this.populateForm();
      this.restoreOriginalPhoto();
      
      // Marcar formulário como pristine
      this.vehicleForm.markAsPristine();
      this.vehicleForm.markAsUntouched();
    }
  }

  // Obter nome completo do veículo
  getVehicleFullName(): string {
    if (!this.vehicle) return 'Carregando...';
    return `${this.vehicle.brand} ${this.vehicle.model} ${this.vehicle.year}`;
  }
}