import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { EmailService } from '../../services/email';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
navigateToDashboard() {
throw new Error('Method not implemented.');
}
  
  // Estados principais
  hasVehicles = false;
  isLoading = false;
  vehicles: Vehicle[] = [];
  totalVehicles = 0;
  recentVehicle: Vehicle | null = null;
  
  private vehiclesSubscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private vehicleService: VehicleService,
    private notificationService: NotificationService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.initializeVehicles();
    this.vehicleService.migrateFromLocalStorage();
  }

  ngOnDestroy(): void {
    this.vehiclesSubscription.unsubscribe();
  }

  // ===== INICIALIZAÇÃO =====
  private initializeVehicles(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.isLoading = true;
    this.vehiclesSubscription = this.vehicleService.getVehiclesByUser(userId).subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.hasVehicles = vehicles.length > 0;
        this.totalVehicles = vehicles.length;
        this.recentVehicle = this.getLatestVehicle(vehicles);
        this.isLoading = false;
        console.log('Veículos carregados:', vehicles.length);
      },
      error: (error) => {
        console.error('Erro ao carregar veículos:', error);
        this.isLoading = false;
      }
    });
  }

  private getLatestVehicle(vehicles: Vehicle[]): Vehicle | null {
    return vehicles.length === 0 ? null : 
      vehicles.reduce((latest, current) => 
        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
      );
  }

  // ===== MÉTODOS DE USUÁRIO =====
  getUserDisplayName = () => this.authService.getUserDisplayName();
  getUserFirstName = () => this.authService.getUserFirstName();
  getUserEmail = () => this.authService.getUserEmail();
  get currentUser() { return this.authService.getCurrentUser(); }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ===== AÇÕES DE VEÍCULOS =====
  addFirstVehicle = () => this.router.navigate(['/add-vehicle']);
  addNewVehicle = () => this.router.navigate(['/add-vehicle']);

  viewVehicleDetails(vehicleId?: string): void {
    if (!vehicleId) return this.showError('ID do veículo não encontrado');
    this.router.navigate(['/vehicles', vehicleId]);
  }

  editVehicle(vehicleId?: string): void {
    if (!vehicleId) return this.showError('ID do veículo não encontrado');
    this.router.navigate(['/vehicles', vehicleId, 'edit']);
  }

  async removeVehicle(vehicle: Vehicle): Promise<void> {
    if (!vehicle.id) return this.showError('ID do veículo não encontrado');
    
    if (!confirm(`Remover ${vehicle.brand} ${vehicle.model}?`)) return;
    
    try {
      await this.vehicleService.removeVehicle(vehicle.id);
      console.log('Veículo removido');
    } catch (error) {
      console.error('Erro ao remover:', error);
      this.showError('Erro ao remover veículo');
    }
  }

  // ===== FORMATAÇÃO E EXIBIÇÃO =====
  getVehicleFullName = (vehicle: Vehicle) => `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;

  getFuelBadgeClass(fuel: string): string {
    const classes = {
      gasoline: 'bg-primary', ethanol: 'bg-success', flex: 'bg-info',
      diesel: 'bg-warning', electric: 'bg-success', hybrid: 'bg-secondary'
    };
    return classes[fuel as keyof typeof classes] || 'bg-secondary';
  }

  getFuelDisplayName(fuel: string): string {
    const names = {
      gasoline: 'Gasolina', ethanol: 'Etanol', flex: 'Flex',
      diesel: 'Diesel', electric: 'Elétrico', hybrid: 'Híbrido'
    };
    return names[fuel as keyof typeof names] || fuel;
  }

  getTransmissionDisplayName(transmission: string): string {
    const names = { manual: 'Manual', automatic: 'Automática', cvt: 'CVT' };
    return names[transmission as keyof typeof names] || transmission;
  }

  formatMileage = (mileage: number) => new Intl.NumberFormat('pt-BR').format(mileage) + ' km';

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Data não disponível';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date ? dateObj.toLocaleDateString('pt-BR') : 'Data inválida';
  }

  // ===== NAVEGAÇÃO =====
  private navigate(route: string[], successMsg: string, errorMsg: string): void {
    this.router.navigate(route).then(success => {
      console.log(success ? successMsg : `Falha: ${errorMsg}`);
      if (!success) this.showError(errorMsg);
    }).catch(error => {
      console.error('Erro na navegação:', error);
      this.showError(errorMsg);
    });
  }

  goToMaintenance = () => this.navigate(['/maintenance'], 'Navegação para manutenções OK', 'Erro ao navegar para manutenções');
  navigateToMaintenance = () => this.goToMaintenance();
  navigateToExpenses = () => this.navigate(['/expenses'], 'Navegação para gastos OK', 'Erro ao navegar para gastos');

  navigateToVehicles(): void {
    console.log('Página de Veículos em desenvolvimento');
    alert('Página de Veículos será implementada em breve!');
  }

  navigateToProfile(): void {
    console.log('Página de Perfil em desenvolvimento');
    alert('Página de Perfil será implementada em breve!');
  }

  navigateToSettings(): void {
    console.log('Página de Configurações em desenvolvimento');
    alert('Página de Configurações será implementada em breve!');
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
      this.showError('Erro ao sair');
    }
  }

  // ===== EMAIL E NOTIFICAÇÕES =====
  getEmailServiceStatus(): string {
    if (!this.emailService.isConfigured()) return '⚠️ EmailJS não configurado';
    const status = this.notificationService.getServiceStatus();
    return status.isRunning ? '✅ Sistema Ativo' : '❌ Sistema Inativo';
  }

  // ===== ESTATÍSTICAS =====
  getTotalVehicles = () => this.totalVehicles;
  getUpcomingMaintenanceCount = () => 0; // TODO: Implementar
  getTotalExpensesThisMonth = () => 0; // TODO: Implementar
  getVehicleStats = () => this.vehicleService.getVehicleStats();
  isFirstTimeUser = () => !this.hasVehicles;

  // ===== UTILITÁRIOS =====
  private showError(message: string): void {
    console.error(message);
    alert(message);
  }

  refreshDashboard(): void {
    this.initializeVehicles();
  }

  async clearAllVehicles(): Promise<void> {
    if (confirm('Limpar todos os veículos? Ação irreversível!')) {
      await this.vehicleService.clearAllVehicles();
      console.log('Veículos limpos');
    }
  }

  // ===== DEBUG E MIGRAÇÃO =====
  forceSyncVehicles(): void {
    console.log('🔄 Sincronizando veículos...');
    this.vehicleService.reinitializeListener();
  }

  checkMigrationStatus(): void {
    const hasLocal = !!localStorage.getItem('vehicles');
    const hasFirebase = this.vehicles.length > 0;
    
    console.log('Migração:', { localStorage: hasLocal, firebase: hasFirebase });
    
    if (hasLocal && !hasFirebase) {
      console.log('⚠️ Executando migração...');
      this.vehicleService.migrateFromLocalStorage();
    }
  }
}