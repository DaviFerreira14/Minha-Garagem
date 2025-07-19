// edit-vehicle.component.ts - VERSÃO SIMPLIFICADA
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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
  
  isLoading = true;
  isSubmitting = false;
  isDragOver = false;
  error: string | null = null;
  
  photoPreview: string | null = null;
  selectedPhoto: File | null = null;
  photoChanged = false;
  
  years: number[] = [];
  private routeSubscription = new Subscription();

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

  // ===== INICIALIZAÇÃO =====
  private generateYearsList(): void {
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
  }

  private initializeForm(): void {
    this.vehicleForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', Validators.required],
      licensePlate: ['', Validators.required],
      color: ['', Validators.required],
      fuel: ['', Validators.required],
      mileage: ['', [Validators.required, Validators.min(0)]],
      engineSize: [''],
      transmission: ['', Validators.required],
      doors: ['', Validators.required],
      observations: ['']
    });
  }

  private loadVehicleForEdit(): void {
    this.routeSubscription = this.route.params.subscribe(params => {
      const vehicleId = params['id'];
      vehicleId ? this.loadVehicle(vehicleId) : this.setError('ID do veículo não fornecido');
    });
  }

  private loadVehicle(vehicleId: string): void {
    try {
      const vehicle = this.vehicleService.getVehicleById(vehicleId);
      
      if (!vehicle) return this.setError('Veículo não encontrado');
      
      const currentUserId = this.authService.getUserId();
      if (vehicle.userId !== currentUserId) {
        return this.setError('Você não tem permissão para editar este veículo');
      }

      this.vehicle = vehicle;
      this.originalVehicle = { ...vehicle };
      this.populateForm();
      this.isLoading = false;

    } catch (error) {
      console.error('Erro ao carregar veículo:', error);
      this.setError('Erro ao carregar veículo para edição');
    }
  }

  private populateForm(): void {
    if (!this.vehicle) return;

    const { engineSize, observations, photo, ...vehicleData } = this.vehicle;
    
    this.vehicleForm.patchValue({
      ...vehicleData,
      engineSize: engineSize || '',
      observations: observations || ''
    });

    this.photoPreview = photo || null;
  }

  private setError(message: string): void {
    this.error = message;
    this.isLoading = false;
  }

  // ===== VALIDAÇÃO =====
  hasError = (field: string, errorType: string) => {
    const control = this.vehicleForm.get(field);
    return control?.hasError(errorType) && (control.dirty || control.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.vehicleForm.get(fieldName);
    if (!field?.errors || (!field.dirty && !field.touched)) return '';

    const displayNames = {
      brand: 'Marca', model: 'Modelo', year: 'Ano', licensePlate: 'Placa',
      color: 'Cor', fuel: 'Combustível', mileage: 'Quilometragem',
      transmission: 'Transmissão', doors: 'Portas'
    };

    const displayName = displayNames[fieldName as keyof typeof displayNames] || fieldName;

    if (field.errors['required']) return `${displayName} é obrigatório`;
    if (field.errors['min']) return `${displayName} deve ser maior que ${field.errors['min'].min}`;
    return '';
  }

  hasChanges(): boolean {
    if (!this.vehicle || !this.originalVehicle) return false;
    
    const formValues = this.vehicleForm.value;
    const original = this.originalVehicle;
    
    const fieldsChanged = ['brand', 'model', 'year', 'licensePlate', 'color', 'fuel', 'mileage', 'transmission', 'doors']
      .some(field => formValues[field] !== original[field as keyof Vehicle]) ||
      formValues.engineSize !== (original.engineSize || '') ||
      formValues.observations !== (original.observations || '');
    
    return fieldsChanged || this.photoChanged;
  }

  // ===== FOTO =====
  onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.[0]?.type.startsWith('image/')) {
      this.processImageFile(files[0]);
    }
  }

  triggerFileInput = () => this.fileInput.nativeElement.click();

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      this.processImageFile(file);
    }
  }

  private processImageFile(file: File): void {
    this.selectedPhoto = file;
    this.photoChanged = true;
    
    const reader = new FileReader();
    reader.onload = (e: any) => this.photoPreview = e.target.result;
    reader.readAsDataURL(file);
  }

  changePhoto = () => this.triggerFileInput();

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    this.photoChanged = true;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  restoreOriginalPhoto(): void {
    this.selectedPhoto = null;
    this.photoChanged = false;
    this.photoPreview = this.originalVehicle?.photo || null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // ===== FORMATAÇÃO =====
  formatLicensePlate(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length > 3 && value.length <= 7) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
      value = value.slice(0, 8);
    }

    event.target.value = value;
    this.vehicleForm.get('licensePlate')?.setValue(value);
  }

  // ===== AÇÕES =====
  async onSubmit(): Promise<void> {
    if (!this.vehicleForm.valid || this.isSubmitting || !this.vehicle?.id) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    
    try {
      const formData = this.vehicleForm.value;
      
      let photoBase64 = this.vehicle.photo;
      if (this.photoChanged) {
        photoBase64 = this.selectedPhoto 
          ? await this.vehicleService.processImageFile(this.selectedPhoto)
          : '';
      }

      const updatedData: Partial<Vehicle> = {
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

      await this.vehicleService.updateVehicle(this.vehicle.id, updatedData);
      console.log('Veículo atualizado com sucesso');
      
      // CORRIGIDO: Redirecionar para dashboard após salvar
      this.router.navigate(['/dashboard']);
        
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      alert('Erro ao atualizar veículo. Tente novamente.');
    } finally {
      this.isSubmitting = false;
    }
  }

  // CORRIGIDO: Voltar sempre para dashboard
  cancel(): void {
    if (this.hasChanges() && !confirm('Você tem alterações não salvas. Deseja realmente cancelar?')) {
      return;
    }
    
    this.router.navigate(['/dashboard']);
  }

  resetForm(): void {
    if (!confirm('Deseja resetar o formulário para os valores originais?')) return;
    
    this.populateForm();
    this.restoreOriginalPhoto();
    this.vehicleForm.markAsPristine();
    this.vehicleForm.markAsUntouched();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.vehicleForm.controls).forEach(key => {
      this.vehicleForm.get(key)?.markAsTouched();
    });
  }

  getVehicleFullName(): string {
    return this.vehicle 
      ? `${this.vehicle.brand} ${this.vehicle.model} ${this.vehicle.year}`
      : 'Carregando...';
  }
}