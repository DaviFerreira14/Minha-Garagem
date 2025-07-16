// src/app/componentes/dashboard/dashboard.ts - VERSÃO COMPLETA
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Serviços
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
  
  // Estado da dashboard
  hasVehicles: boolean = false;
  isLoading: boolean = false;
  vehicles: Vehicle[] = [];
  userVehicles: Vehicle[] = [];
  
  // Estatísticas
  totalVehicles: number = 0;
  recentVehicle: Vehicle | null = null;
  
  // Subscriptions
  private vehiclesSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private vehicleService: VehicleService,
    private notificationService: NotificationService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.checkUserAuthentication();
    this.loadDashboardData();
    this.subscribeToVehicleUpdates();
  }

  ngOnDestroy(): void {
    this.vehiclesSubscription.unsubscribe();
  }

  // Verificar se usuário está autenticado
  private checkUserAuthentication(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  // Inscrever-se em atualizações de veículos
  private subscribeToVehicleUpdates(): void {
    const currentUserId = this.authService.getUserId();
    
    if (!currentUserId) {
      console.error('Usuário não está logado');
      this.router.navigate(['/login']);
      return;
    }
    
    this.vehiclesSubscription = this.vehicleService.getVehiclesByUser(currentUserId).subscribe({
      next: (vehicles) => {
        console.log('Veículos recebidos no dashboard:', vehicles);
        this.userVehicles = vehicles;
        this.vehicles = vehicles; // Para compatibilidade
        this.hasVehicles = vehicles.length > 0;
        this.totalVehicles = vehicles.length;
        this.recentVehicle = this.getLatestVehicle(vehicles);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar veículos:', error);
        this.isLoading = false;
      }
    });
  }

  // Carregar dados da dashboard
  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Os dados são carregados automaticamente através da subscription
    // Não precisamos fazer nada aqui além de definir o estado de loading
  }

  // Obter veículo mais recente
  private getLatestVehicle(vehicles: Vehicle[]): Vehicle | null {
    if (vehicles.length === 0) return null;
    
    return vehicles.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });
  }

  // Obter nome do usuário para exibição
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  // Obter primeiro nome do usuário
  getUserFirstName(): string {
    return this.authService.getUserFirstName();
  }

  // Obter email do usuário
  getUserEmail(): string | null {
    return this.authService.getUserEmail();
  }

  // Obter usuário atual
  private getCurrentUser(): any {
    return this.authService.getCurrentUser();
  }

  // Obter data atual formatada
  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return today.toLocaleDateString('pt-BR', options);
  }

  // Ação principal: Adicionar primeiro veículo
  addFirstVehicle(): void {
    this.router.navigate(['/add-vehicle']);
  }

  // Adicionar novo veículo
  addNewVehicle(): void {
    this.router.navigate(['/add-vehicle']);
  }

  // Ver detalhes do veículo
  viewVehicleDetails(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  // Editar veículo
  editVehicle(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId, 'edit']);
  }

  // Remover veículo
  async removeVehicle(vehicle: Vehicle): Promise<void> {
    const confirmRemove = confirm(`Tem certeza que deseja remover o ${vehicle.brand} ${vehicle.model}?`);
    if (confirmRemove) {
      try {
        await this.vehicleService.removeVehicle(vehicle.id);
        console.log('Veículo removido com sucesso');
      } catch (error) {
        console.error('Erro ao remover veículo:', error);
        alert('Erro ao remover veículo. Tente novamente.');
      }
    }
  }

  // Obter nome completo do veículo
  getVehicleFullName(vehicle: Vehicle): string {
    return `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  }

  // Obter cor do badge de combustível
  getFuelBadgeClass(fuel: string): string {
    const fuelClasses: { [key: string]: string } = {
      'gasoline': 'bg-primary',
      'ethanol': 'bg-success',
      'flex': 'bg-info',
      'diesel': 'bg-warning',
      'electric': 'bg-success',
      'hybrid': 'bg-secondary'
    };
    return fuelClasses[fuel] || 'bg-secondary';
  }

  // Obter nome do combustível
  getFuelDisplayName(fuel: string): string {
    const fuelNames: { [key: string]: string } = {
      'gasoline': 'Gasolina',
      'ethanol': 'Etanol',
      'flex': 'Flex',
      'diesel': 'Diesel',
      'electric': 'Elétrico',
      'hybrid': 'Híbrido'
    };
    return fuelNames[fuel] || fuel;
  }

  // Obter nome da transmissão
  getTransmissionDisplayName(transmission: string): string {
    const transmissionNames: { [key: string]: string } = {
      'manual': 'Manual',
      'automatic': 'Automática',
      'cvt': 'CVT'
    };
    return transmissionNames[transmission] || transmission;
  }

  // Formatação de números
  formatMileage(mileage: number): string {
    return new Intl.NumberFormat('pt-BR').format(mileage) + ' km';
  }

  // MÉTODOS DE NAVEGAÇÃO:

  // Navegação para Manutenções
  goToMaintenance(): void {
    console.log('Navegando para manutenções...');
    this.router.navigate(['/maintenance']).then(success => {
      if (success) {
        console.log('Navegação para manutenções bem-sucedida');
      } else {
        console.error('Falha na navegação para manutenções');
        alert('Erro ao navegar para manutenções. Verifique se a rota está configurada.');
      }
    }).catch(error => {
      console.error('Erro na navegação:', error);
      alert('Erro ao navegar para manutenções.');
    });
  }

  // Navegação para outros módulos
  navigateToVehicles(): void {
    console.log('Navegando para veículos...');
    // this.router.navigate(['/vehicles']);
    alert('Página de Veículos será implementada em breve!');
  }

  navigateToMaintenance(): void {
    // Redirecionar para o método correto
    this.goToMaintenance();
  }

  navigateToExpenses(): void {
    console.log('Navegando para gastos...');
    // this.router.navigate(['/expenses']);
    alert('Página de Gastos será implementada em breve!');
  }

  navigateToProfile(): void {
    console.log('Navegando para perfil...');
    // this.router.navigate(['/profile']);
    alert('Página de Perfil será implementada em breve!');
  }

  navigateToSettings(): void {
    console.log('Navegando para configurações...');
    // this.router.navigate(['/settings']);
    alert('Página de Configurações será implementada em breve!');
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      // O AuthService já redireciona para login
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao sair. Tente novamente.');
    }
  }

  // MÉTODOS DE EMAIL E NOTIFICAÇÕES:

  // Método para verificar status do serviço de email
  getEmailServiceStatus(): string {
    if (!this.emailService.isConfigured()) {
      return '⚠️ EmailJS não configurado';
    }
    
    const status = this.notificationService.getServiceStatus();
    return status.isRunning ? '✅ Serviço ativo' : '❌ Serviço inativo';
  }

  // MÉTODOS PARA ESTATÍSTICAS:
  getTotalVehicles(): number {
    return this.totalVehicles;
  }

  getUpcomingMaintenanceCount(): number {
    // Implementar lógica para contar manutenções próximas
    return 0;
  }

  getTotalExpensesThisMonth(): number {
    // Implementar lógica para calcular gastos do mês
    return 0;
  }

  // Método para recarregar dados
  refreshDashboard(): void {
    this.loadDashboardData();
  }

  // Verificar se é primeira visita do usuário
  isFirstTimeUser(): boolean {
    return !this.hasVehicles;
  }

  // Obter estatísticas dos veículos
  getVehicleStats() {
    return this.vehicleService.getVehicleStats();
  }

  // Método para desenvolvimento - limpar todos os veículos
  clearAllVehicles(): void {
    if (confirm('Tem certeza que deseja limpar todos os veículos? Esta ação não pode ser desfeita.')) {
      this.vehicleService.clearAllVehicles();
      console.log('Todos os veículos foram removidos');
    }
  }

  // Getter para o usuário atual
  get currentUser() {
    return this.authService.getCurrentUser();
  }
}