import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

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

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'info';

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
    this.loadDraft();
  }

  generateYearsList(): void {
    const currentYear = new Date().getFullYear();
    this.years = [];
    for (let year = currentYear; year >= 1900; year--) {
      this.years.push(year);
    }
  }

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

  get f() {
    return this.vehicleForm.controls;
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.vehicleForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

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

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.processImageFile(file);
    }
  }

  private processImageFile(file: File): void {
    this.selectedPhoto = file;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  changePhoto(): void {
    this.triggerFileInput();
  }

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

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

  async onSubmit(): Promise<void> {
    if (this.vehicleForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        await this.authService.waitForAuthStateInitialized();
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser || !currentUser.uid) {
          throw new Error('Usuário não está logado');
        }

        const formData = this.vehicleForm.value;

        let photoBase64 = '';
        if (this.selectedPhoto) {
          photoBase64 = await this.vehicleService.processImageFile(this.selectedPhoto);
        }

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
          userId: currentUser.uid
        };

        await this.vehicleService.addVehicle(vehicleData);
        localStorage.removeItem('vehicleDraft');
        this.router.navigate(['/dashboard']);

      } catch (error) {
        console.error('Erro ao salvar veículo:', error);
        this.showNotificationMessage('Erro ao salvar veículo. Tente novamente.', 'error');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private showNotificationMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    
    setTimeout(() => {
      this.hideNotification();
    }, 4000);
  }

  hideNotification(): void {
    this.showNotification = false;
    setTimeout(() => {
      this.notificationMessage = '';
    }, 300);
  }

  saveAsDraft(): void {
    const draftData = {
      form: this.vehicleForm.value,
      photo: this.photoPreview,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('vehicleDraft', JSON.stringify(draftData));
    this.showNotificationMessage('Rascunho salvo com sucesso!', 'success');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.vehicleForm.controls).forEach(key => {
      const control = this.vehicleForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  goToDashboard(): void {
    if (this.vehicleForm.dirty) {
      const confirmLeave = confirm('Você tem alterações não salvas. Deseja sair mesmo assim?');
      if (!confirmLeave) {
        return;
      }
    }
    this.router.navigate(['/dashboard']);
  }
}