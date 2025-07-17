// dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  // Estados principais
  vehicles: Vehicle[] = [];
  isLoading = true;
  errorMessage = '';
  
  private vehicleSubscription?: Subscription;

  constructor(
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
    this.vehicleService.migrateFromLocalStorage();
  }

  ngOnDestroy(): void {
    if (this.vehicleSubscription) {
      this.vehicleSubscription.unsubscribe();
    }
  }

  // ===== CARREGAMENTO =====
  private loadVehicles(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.vehicleSubscription = this.vehicleService.getVehicles().subscribe({
      next: (vehicles: Vehicle[]) => {
        this.vehicles = vehicles;
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error: any) => {
        console.error('Erro ao carregar veículos:', error);
        this.errorMessage = 'Erro ao carregar veículos';
        this.isLoading = false;
      }
    });
  }

  // ===== PROPRIEDADES CALCULADAS =====
  get hasVehicles(): boolean {
    return this.vehicles.length > 0;
  }

  get totalVehicles(): number {
    return this.vehicles.length;
  }

  // ===== MÉTODOS DO USUÁRIO =====
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  getUserFirstName(): string {
    return this.authService.getUserFirstName();
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  // ===== MÉTODOS DE VEÍCULO =====
  getVehicleFullName(vehicle: Vehicle): string {
    return `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  }

  getFuelDisplayName(fuel: string): string {
    const names: { [key: string]: string } = {
      'gasoline': 'Gasolina',
      'ethanol': 'Etanol',
      'flex': 'Flex',
      'diesel': 'Diesel',
      'electric': 'Elétrico',
      'hybrid': 'Híbrido'
    };
    return names[fuel] || fuel;
  }

  getFuelBadgeClass(fuel: string): string {
    const classes: { [key: string]: string } = {
      'gasoline': 'bg-primary',
      'ethanol': 'bg-success',
      'flex': 'bg-warning',
      'diesel': 'bg-dark',
      'electric': 'bg-info',
      'hybrid': 'bg-secondary'
    };
    return classes[fuel] || 'bg-secondary';
  }

  getTransmissionDisplayName(transmission: string): string {
    const names: { [key: string]: string } = {
      'manual': 'Manual',
      'automatic': 'Automática',
      'cvt': 'CVT',
      'semi-automatic': 'Semi-automática'
    };
    return names[transmission] || transmission;
  }

  formatMileage(mileage: number): string {
    return mileage.toLocaleString('pt-BR') + ' km';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Data não disponível';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  // ===== AÇÕES DE VEÍCULO =====
  async removeVehicle(vehicle: Vehicle): Promise<void> {
    if (!vehicle.id) return;
    
    const confirmDelete = confirm(`Tem certeza que deseja excluir o veículo ${vehicle.brand} ${vehicle.model}?`);
    
    if (confirmDelete) {
      try {
        await this.vehicleService.removeVehicle(vehicle.id);
      } catch (error) {
        console.error('Erro ao deletar veículo:', error);
        this.errorMessage = 'Erro ao deletar veículo';
      }
    }
  }

  async deleteVehicle(vehicle: Vehicle): Promise<void> {
    return this.removeVehicle(vehicle);
  }

  // ===== NAVEGAÇÃO =====
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToExpenses(): void {
    this.router.navigate(['/expenses']);
  }

  navigateToMaintenance(): void {
    this.router.navigate(['/maintenance']);
  }

  goToMaintenance(): void {
    this.router.navigate(['/maintenance']);
  }

  addFirstVehicle(): void {
    this.router.navigate(['/add-vehicle']);
  }

  addNewVehicle(): void {
    this.router.navigate(['/add-vehicle']);
  }

  goToAddVehicle(): void {
    this.router.navigate(['/add-vehicle']);
  }

  viewVehicleDetails(vehicleId: string): void {
    this.router.navigate(['/vehicle-details', vehicleId]);
  }

  goToVehicleDetails(vehicle: Vehicle): void {
    if (vehicle.id) {
      this.router.navigate(['/vehicle-details', vehicle.id]);
    }
  }

  editVehicle(vehicleId: string): void {
    this.router.navigate(['/edit-vehicle', vehicleId]);
  }

  goToEditVehicle(vehicle: Vehicle): void {
    if (vehicle.id) {
      this.router.navigate(['/edit-vehicle', vehicle.id]);
    }
  }

  goToExpenses(): void {
    this.router.navigate(['/expenses']);
  }

  goToReports(): void {
    this.router.navigate(['/reports']);
  }

  // ===== ESTATÍSTICAS PLACEHOLDER =====
  getUpcomingMaintenanceCount(): number {
    return 0; // Implementar depois
  }

  getTotalExpensesThisMonth(): string {
    return '0,00'; // Implementar depois
  }

  getEmailServiceStatus(): string {
    return 'Serviço ativo'; // Implementar depois
  }

  // ===== MÉTODOS DE DESENVOLVIMENTO =====
  async clearAllVehicles(): Promise<void> {
    const confirmClear = confirm('Tem certeza que deseja limpar todos os veículos? Esta ação não pode ser desfeita.');
    
    if (confirmClear) {
      try {
        await this.vehicleService.clearAllVehicles();
        console.log('Todos os veículos foram removidos');
      } catch (error) {
        console.error('Erro ao limpar veículos:', error);
        this.errorMessage = 'Erro ao limpar veículos';
      }
    }
  }

  reinitializeListener(): void {
    this.vehicleService.reinitializeListener();
  }

  async migrateData(): Promise<void> {
    try {
      await this.vehicleService.migrateFromLocalStorage();
      console.log('Migração concluída');
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  }

  refreshDashboard(): void {
    this.loadVehicles();
  }

  // ===== LOGOUT =====
  async logout(): Promise<void> {
    await this.authService.logout();
  }
}