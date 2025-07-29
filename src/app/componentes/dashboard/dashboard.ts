import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { MaintenanceService } from '../../services/maintenance';
import { ExpenseService } from '../../services/expense';
import { NavbarComponent } from "../navbar/navbar";
import { FooterComponent } from "../footer/footer";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  isLoading = true;
  errorMessage = '';
  
  showDeleteModal = false;
  vehicleToDelete: Vehicle | null = null;
  isDeleting = false;
  
  upcomingMaintenanceCount = 0;
  totalMaintenanceCount = 0;
  totalExpensesThisMonth = '0,00';
  
  private vehicleSubscription?: Subscription;

  constructor(
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private maintenanceService: MaintenanceService,
    private expenseService: ExpenseService
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
    this.vehicleService.migrateFromLocalStorage();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.vehicleSubscription?.unsubscribe();
  }

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
        this.loadStatistics();
      },
      error: (error: any) => {
        this.errorMessage = 'Erro ao carregar veículos';
        this.isLoading = false;
      }
    });
  }

  private async loadStatistics(): Promise<void> {
    await Promise.all([this.loadMaintenanceData(), this.loadExpenseData()]);
  }

  private async loadMaintenanceData(): Promise<void> {
    try {
      const maintenances = await this.maintenanceService.getUserMaintenances();
      const now = new Date();
      const upcoming = maintenances.filter(m => {
        return m.type === 'agendada' && new Date(m.date) > now;
      });
      
      this.totalMaintenanceCount = maintenances.length;
      this.upcomingMaintenanceCount = upcoming.length;
    } catch (error) {
      this.upcomingMaintenanceCount = 0;
    }
  }

  private async loadExpenseData(): Promise<void> {
    try {
      const expenses = await this.expenseService.getCurrentMonthExpenses();
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      this.totalExpensesThisMonth = total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      this.totalExpensesThisMonth = '0,00';
    }
  }

  get hasVehicles(): boolean { return this.vehicles.length > 0; }
  get totalVehicles(): number { return this.vehicles.length; }

  getUserDisplayName(): string { return this.authService.getUserDisplayName(); }
  getUserFirstName(): string { return this.authService.getUserFirstName(); }
  get currentUser() { return this.authService.getCurrentUser(); }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getUpcomingMaintenanceCount(): number { 
    return this.totalMaintenanceCount > 0 ? this.totalMaintenanceCount : this.upcomingMaintenanceCount;
  }
  getTotalExpensesThisMonth(): string { return this.totalExpensesThisMonth; }

  getVehicleFullName(vehicle: Vehicle): string {
    return `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  }

  getFuelDisplayName(fuel: string): string {
    const names: { [key: string]: string } = {
      'gasoline': 'Gasolina', 'ethanol': 'Etanol', 'flex': 'Flex',
      'diesel': 'Diesel', 'electric': 'Elétrico', 'hybrid': 'Híbrido'
    };
    return names[fuel] || fuel;
  }

  getFuelBadgeClass(fuel: string): string {
    const classes: { [key: string]: string } = {
      'gasoline': 'bg-primary', 'ethanol': 'bg-success', 'flex': 'bg-warning',
      'diesel': 'bg-dark', 'electric': 'bg-info', 'hybrid': 'bg-secondary'
    };
    return classes[fuel] || 'bg-secondary';
  }

  getTransmissionDisplayName(transmission: string): string {
    const names: { [key: string]: string } = {
      'manual': 'Manual', 'automatic': 'Automática', 
      'cvt': 'CVT', 'semi-automatic': 'Semi-automática'
    };
    return names[transmission] || transmission;
  }

  formatMileage(mileage: number): string {
    return mileage.toLocaleString('pt-BR') + ' km';
  }

  formatDate(date: Date | undefined): string {
    return date ? new Date(date).toLocaleDateString('pt-BR') : 'Data não disponível';
  }

  removeVehicle(vehicle: Vehicle): void {
    if (!vehicle.id) return;
    this.vehicleToDelete = vehicle;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.vehicleToDelete = null;
    this.isDeleting = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.vehicleToDelete?.id) return;
    
    this.isDeleting = true;
    try {
      await this.vehicleService.removeVehicle(this.vehicleToDelete.id);
      this.showDeleteModal = false;
      this.vehicleToDelete = null;
      setTimeout(() => this.loadStatistics(), 100);
    } catch (error) {
      this.errorMessage = 'Erro ao deletar veículo';
    } finally {
      this.isDeleting = false;
    }
  }

  addNewVehicle(): void { this.router.navigate(['/add-vehicle']); }
  
  viewVehicleDetails(vehicleId: string): void { 
    if (vehicleId) this.router.navigate(['/vehicles', vehicleId]); 
  }
  
  editVehicle(vehicleId: string): void { 
    if (vehicleId) this.router.navigate(['/vehicles', vehicleId, 'edit']); 
  }
  
  navigateToExpenses(): void { this.router.navigate(['/expenses']); }
  navigateToMaintenance(): void { this.router.navigate(['/maintenance']); }

  async clearAllVehicles(): Promise<void> {
    const confirmClear = confirm('Tem certeza que deseja limpar todos os veículos? Esta ação não pode ser desfeita.');
    if (confirmClear) {
      try {
        await this.vehicleService.clearAllVehicles();
      } catch (error) {
        this.errorMessage = 'Erro ao limpar veículos';
      }
    }
  }

  reinitializeListener(): void { this.vehicleService.reinitializeListener(); }
  refreshDashboard(): void { this.loadVehicles(); }
  
  async migrateData(): Promise<void> {
    try {
      await this.vehicleService.migrateFromLocalStorage();
    } catch (error) {
    }
  }

  async logout(): Promise<void> { await this.authService.logout(); }
}