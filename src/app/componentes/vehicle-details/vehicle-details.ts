import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-vehicle-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-details.html',
  styleUrls: ['./vehicle-details.css']
})
export class VehicleDetailsComponent implements OnInit, OnDestroy {
  
  vehicle: Vehicle | null = null;
  isLoading = true;
  isDeleting = false;
  error: string | null = null;
  
  private routeSubscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadVehicleDetails();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  private loadVehicleDetails(): void {
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
        return this.setError('Você não tem permissão para visualizar este veículo');
      }

      this.vehicle = vehicle;
      this.isLoading = false;
    } catch (error) {
      this.setError('Erro ao carregar detalhes do veículo');
    }
  }

  private setError(message: string): void {
    this.error = message;
    this.isLoading = false;
  }

  editVehicle(): void {
    if (!this.vehicle?.id) return;
    this.router.navigate(['/vehicles', this.vehicle.id, 'edit']);
  }

  async removeVehicle(): Promise<void> {
    if (!this.vehicle?.id) return;

    if (!confirm(`Tem certeza que deseja remover ${this.getVehicleFullName()}?`)) return;

    this.isDeleting = true;
    
    try {
      await this.vehicleService.removeVehicle(this.vehicle.id);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      alert('Erro ao remover veículo. Tente novamente.');
    } finally {
      this.isDeleting = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  shareVehicle(): void {
    if (!this.vehicle) return;
    
    if (navigator.share) {
      navigator.share({
        title: `${this.getVehicleFullName()} - Minha Garagem`,
        text: `Confira meu ${this.getVehicleFullName()} na Minha Garagem`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copiado para a área de transferência!');
      }).catch(() => {
        alert('Não foi possível copiar o link.');
      });
    }
  }

  getVehicleFullName(): string {
    return this.vehicle 
      ? `${this.vehicle.brand} ${this.vehicle.model} ${this.vehicle.year}`
      : 'Veículo';
  }

  getFuelDisplayName(fuel?: string): string {
    const fuelType = fuel || this.vehicle?.fuel || '';
    const fuelNames = {
      gasoline: 'Gasolina',
      ethanol: 'Etanol', 
      flex: 'Flex',
      diesel: 'Diesel',
      electric: 'Elétrico',
      hybrid: 'Híbrido'
    };
    return fuelNames[fuelType as keyof typeof fuelNames] || fuelType;
  }

  getTransmissionDisplayName(transmission?: string): string {
    const transmissionType = transmission || this.vehicle?.transmission || '';
    const transmissionNames = {
      manual: 'Manual',
      automatic: 'Automática',
      cvt: 'CVT',
      'semi-automatic': 'Semi-automática'
    };
    return transmissionNames[transmissionType as keyof typeof transmissionNames] || transmissionType;
  }

  formatMileage = (mileage: number): string => 
    new Intl.NumberFormat('pt-BR').format(mileage) + ' km';

  getFuelBadgeClass(fuel?: string): string {
    const fuelType = fuel || this.vehicle?.fuel || '';
    const fuelClasses = {
      gasoline: 'bg-primary',
      ethanol: 'bg-success', 
      flex: 'bg-info',
      diesel: 'bg-warning',
      electric: 'bg-success',
      hybrid: 'bg-secondary'
    };
    return fuelClasses[fuelType as keyof typeof fuelClasses] || 'bg-secondary';
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get vehicleAge(): number {
    if (!this.vehicle) return 0;
    return new Date().getFullYear() - this.vehicle.year;
  }

  get isNewVehicle(): boolean {
    return this.vehicleAge <= 3;
  }

  get isOldVehicle(): boolean {
    return this.vehicleAge >= 15;
  }

  get nextMaintenanceKm(): number {
    if (!this.vehicle) return 0;
    
    const maintenanceInterval = 10000;
    const currentMileage = this.vehicle.mileage;
    const nextMaintenance = Math.ceil(currentMileage / maintenanceInterval) * maintenanceInterval;
    
    return nextMaintenance;
  }

  hasPhoto(): boolean {
    return !!(this.vehicle?.photo);
  }

  hasEngineSize(): boolean {
    return !!(this.vehicle?.engineSize);
  }

  hasObservations(): boolean {
    return !!(this.vehicle?.observations);
  }

  hasUpdatedDate(): boolean {
    return !!(this.vehicle?.updatedAt);
  }
}