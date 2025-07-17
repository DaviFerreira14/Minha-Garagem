import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Serviços
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-add-vehicle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-vehicle.html',
  styleUrls: ['./add-vehicle.css']
})
export class AddVehicle implements OnInit, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  vehicleForm!: FormGroup;
  photoPreview: string | null = null;
  selectedPhoto: File | null = null;
  years: number[] = [];
  isSubmitting = false;
  isDragOver = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.generateYearsList();
    this.initializeForm();
    this.loadDraft();
  }

  ngAfterViewInit(): void {
    // Inicialização após a view estar pronta
    this.loadDraft();
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

  // Getter para acessar controles do formulário
  get f() {
    return this.vehicleForm.controls;
  }

  // Obter usuário atual
  getCurrentUser(): any {
    return this.authService.getCurrentUser();
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
      // Adicione mais validações conforme necessário
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

  // Carregar rascunho do localStorage
  private loadDraft(): void {
    const draft = localStorage.getItem('vehicleDraft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        this.vehicleForm.patchValue(draftData.form);
        if (draftData.photo) {
          this.photoPreview = draftData.photo;
        }
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
      }
    }
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
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Formatar placa
  formatLicensePlate(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length <= 3) {
      // Formato antigo: ABC-1234
      value = value;
    } else if (value.length <= 7) {
      // Formato novo: ABC1234 ou ABC1D23
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
 // src/app/pages/vehicle/vehicle.component.ts
async onSubmit(): Promise<void> {
  if (this.vehicleForm.valid && !this.isSubmitting) {
    this.isSubmitting = true;

    try {
      // Aguarda a inicialização do estado de autenticação
      await this.authService.waitForAuthStateInitialized();  // Garantir que o estado está inicializado

      // Verifique se o usuário está logado
      const currentUser = this.authService.getCurrentUser();
      console.log('Usuário atual:', currentUser);  // Verifique no console os dados do usuário

      if (!currentUser || !currentUser.uid) {
        throw new Error('Usuário não está logado');
      }

      const formData = this.vehicleForm.value;

      // Processar foto se existir
      let photoBase64 = '';
      if (this.selectedPhoto) {
        photoBase64 = await this.vehicleService.processImageFile(this.selectedPhoto);
      }

      // Preparar dados do veículo
      const vehicleData: Omit<Vehicle, 'id' | 'createdAt'> = {
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
        photo: photoBase64,
        userId: currentUser.uid // Garantido que o usuário está logado
      };

      // Salvar veículo usando o serviço
      const savedVehicle = await this.vehicleService.addVehicle(vehicleData);
      console.log('Veículo salvo com sucesso:', savedVehicle);

      // Limpar rascunho após sucesso
      localStorage.removeItem('vehicleDraft');

      // Mostrar mensagem de sucesso (opcional)
      this.showSuccessMessage();

      // Aguardar um pouco antes de navegar para melhor UX
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);

    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      this.showErrorMessage('Erro ao salvar veículo. Tente novamente.');
    } finally {
      this.isSubmitting = false;
    }
  } else {
    this.markFormGroupTouched();
  }
}



  // Mostrar mensagem de sucesso
  private showSuccessMessage(): void {
    // Você pode implementar um toast/snackbar aqui
    // Por enquanto, apenas um alert
    alert('Veículo salvo com sucesso! Redirecionando para o dashboard...');
  }

  // Mostrar mensagem de erro
  private showErrorMessage(message: string): void {
    // Você pode implementar um toast/snackbar aqui
    // Por enquanto, apenas um alert
    alert(message);
  }

  // Salvar como rascunho
  saveAsDraft(): void {
    const draftData = {
      form: this.vehicleForm.value,
      photo: this.photoPreview,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('vehicleDraft', JSON.stringify(draftData));
    console.log('Rascunho salvo');
    alert('Rascunho salvo com sucesso!');
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

  // Navegar para dashboard
  goToDashboard(): void {
    // Confirmar se quer sair sem salvar
    if (this.vehicleForm.dirty) {
      const confirmLeave = confirm('Você tem alterações não salvas. Deseja sair mesmo assim?');
      if (!confirmLeave) {
        return;
      }
    }
    this.router.navigate(['/dashboard']);
  }

  // Método para desenvolvimento - limpar todos os veículos
  clearAllVehicles(): void {
    if (confirm('Tem certeza que deseja limpar todos os veículos? Esta ação não pode ser desfeita.')) {
      this.vehicleService.clearAllVehicles();
      console.log('Todos os veículos foram removidos');
    }
  }
}