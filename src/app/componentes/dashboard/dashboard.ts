// dashboard.component.ts
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
  // Estados principais
  vehicles: Vehicle[] = [];
  isLoading = true;
  errorMessage = '';
  
  // Estados do modal
  showDeleteModal = false;
  vehicleToDelete: Vehicle | null = null;
  isDeleting = false;
  
  // Estatísticas
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
        this.loadStatistics();
      },
      error: (error: any) => {
        console.error('Erro ao carregar veículos:', error);
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
      console.log('🔧 Iniciando carregamento de manutenções...');
      
      const maintenances = await this.maintenanceService.getUserMaintenances();
      console.log('📋 Manutenções encontradas:', maintenances);
      console.log('📊 Total de manutenções:', maintenances.length);
      
      if (maintenances.length > 0) {
        console.log('🔍 Detalhes das manutenções:');
        maintenances.forEach((m, index) => {
          console.log(`  ${index + 1}. Tipo: "${m.type}", Data: ${m.date}, Título: "${m.title}"`);
        });
      }
      
      const now = new Date();
      console.log('📅 Data atual:', now);
      
      const upcoming = maintenances.filter(m => {
        const isScheduled = m.type === 'agendada';
        const isFuture = new Date(m.date) > now;
        console.log(`  ⚙️ ${m.title}: tipo="${m.type}" (agendada=${isScheduled}), data=${m.date} (futura=${isFuture})`);
        return isScheduled && isFuture;
      });
      
      this.totalMaintenanceCount = maintenances.length;
      this.upcomingMaintenanceCount = upcoming.length;
      console.log('✅ Total de manutenções:', this.totalMaintenanceCount);
      console.log('✅ Manutenções próximas calculadas:', this.upcomingMaintenanceCount);
      
    } catch (error) {
      console.error('❌ Erro ao carregar manutenções:', error);
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
      
      console.log('Gastos do mês:', expenses.length, 'Total:', this.totalExpensesThisMonth);
    } catch (error) {
      console.error('Erro ao carregar gastos:', error);
      this.totalExpensesThisMonth = '0,00';
    }
  }

  // ===== PROPRIEDADES CALCULADAS =====
  get hasVehicles(): boolean { return this.vehicles.length > 0; }
  get totalVehicles(): number { return this.vehicles.length; }

  // ===== MÉTODOS DO USUÁRIO =====
  getUserDisplayName(): string { return this.authService.getUserDisplayName(); }
  getUserFirstName(): string { return this.authService.getUserFirstName(); }
  get currentUser() { return this.authService.getCurrentUser(); }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ===== ESTATÍSTICAS =====
  getUpcomingMaintenanceCount(): number { 
    // Temporariamente mostrar total de manutenções para debug
    // Trocar para this.upcomingMaintenanceCount quando funcionar
    return this.totalMaintenanceCount > 0 ? this.totalMaintenanceCount : this.upcomingMaintenanceCount;
  }
  getTotalExpensesThisMonth(): string { return this.totalExpensesThisMonth; }

  // ===== MÉTODOS DE VEÍCULO =====
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

  // ===== AÇÕES DE VEÍCULO =====
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
      console.error('Erro ao deletar veículo:', error);
      this.errorMessage = 'Erro ao deletar veículo';
    } finally {
      this.isDeleting = false;
    }
  }

  // ===== NAVEGAÇÃO =====
  addFirstVehicle(): void { this.router.navigate(['/add-vehicle']); }
  addNewVehicle(): void { this.router.navigate(['/add-vehicle']); }
  viewVehicleDetails(vehicleId: string): void { 
    if (vehicleId) this.router.navigate(['/vehicles', vehicleId]); 
  }
  editVehicle(vehicleId: string): void { 
    if (vehicleId) this.router.navigate(['/vehicles', vehicleId, 'edit']); 
  }
  
  // Métodos de navegação duplicados (manter compatibilidade)
  navigateToDashboard(): void { this.router.navigate(['/dashboard']); }
  navigateToExpenses(): void { this.router.navigate(['/expenses']); }
  navigateToMaintenance(): void { this.router.navigate(['/maintenance']); }
  goToMaintenance(): void { this.router.navigate(['/maintenance']); }
  goToAddVehicle(): void { this.router.navigate(['/add-vehicle']); }
  goToVehicleDetails(vehicle: Vehicle): void { 
    if (vehicle.id) this.router.navigate(['/vehicles', vehicle.id]); 
  }
  goToEditVehicle(vehicle: Vehicle): void { 
    if (vehicle.id) this.router.navigate(['/vehicles', vehicle.id, 'edit']); 
  }
  goToExpenses(): void { this.router.navigate(['/expenses']); }
  goToReports(): void { this.router.navigate(['/reports']); }

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

  reinitializeListener(): void { this.vehicleService.reinitializeListener(); }
  refreshDashboard(): void { this.loadVehicles(); }
  
  async migrateData(): Promise<void> {
    try {
      await this.vehicleService.migrateFromLocalStorage();
      console.log('Migração concluída');
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  }

  // ===== LOGOUT =====
  async logout(): Promise<void> { await this.authService.logout(); }

  // Alias para compatibilidade
  async deleteVehicle(vehicle: Vehicle): Promise<void> { this.removeVehicle(vehicle); }
}