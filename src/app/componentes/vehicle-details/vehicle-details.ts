import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Serviços
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-vehicle-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-details.html',
  styleUrls: ['./vehicle-details.css']
})
export class VehicleDetails implements OnInit, OnDestroy {
  vehicle: Vehicle | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Subscriptions
  private routeSubscription: Subscription = new Subscription();
  
  // Estatísticas calculadas
  vehicleAge: number = 0;
  nextMaintenanceKm: number = 0;

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

  // Carregar detalhes do veículo
  private loadVehicleDetails(): void {
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

  // Carregar veículo específico
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
        this.error = 'Você não tem permissão para ver este veículo';
        this.isLoading = false;
        return;
      }

      this.vehicle = vehicle;
      this.calculateVehicleStats();
      this.isLoading = false;

    } catch (error) {
      console.error('Erro ao carregar veículo:', error);
      this.error = 'Erro ao carregar detalhes do veículo';
      this.isLoading = false;
    }
  }

  // Calcular estatísticas do veículo
  private calculateVehicleStats(): void {
    if (!this.vehicle) return;

    // Calcular idade do veículo
    const currentYear = new Date().getFullYear();
    this.vehicleAge = currentYear - this.vehicle.year;

    // Calcular próxima manutenção (a cada 10.000 km)
    this.nextMaintenanceKm = Math.ceil(this.vehicle.mileage / 10000) * 10000;
  }

  
  // Formatar quilometragem
  formatMileage(mileage: number): string {
    return new Intl.NumberFormat('pt-BR').format(mileage) + ' km';
  }

  // Formatar data
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obter nome completo do veículo
  getVehicleFullName(): string {
    if (!this.vehicle) return '';
    return `${this.vehicle.brand} ${this.vehicle.model} ${this.vehicle.year}`;
  }

  // Obter cor do badge de combustível
  getFuelBadgeClass(): string {
    if (!this.vehicle) return 'bg-secondary';
    
    const fuelClasses: { [key: string]: string } = {
      'gasoline': 'bg-primary',
      'ethanol': 'bg-success',
      'flex': 'bg-info',
      'diesel': 'bg-warning',
      'electric': 'bg-success',
      'hybrid': 'bg-secondary'
    };
    return fuelClasses[this.vehicle.fuel] || 'bg-secondary';
  }

  // Obter nome do combustível
  getFuelDisplayName(): string {
    if (!this.vehicle) return '';
    
    const fuelNames: { [key: string]: string } = {
      'gasoline': 'Gasolina',
      'ethanol': 'Etanol',
      'flex': 'Flex',
      'diesel': 'Diesel',
      'electric': 'Elétrico',
      'hybrid': 'Híbrido'
    };
    return fuelNames[this.vehicle.fuel] || this.vehicle.fuel;
  }

  // Obter nome da transmissão
  getTransmissionDisplayName(): string {
    if (!this.vehicle) return '';
    
    const transmissionNames: { [key: string]: string } = {
      'manual': 'Manual',
      'automatic': 'Automática',
      'cvt': 'CVT'
    };
    return transmissionNames[this.vehicle.transmission] || this.vehicle.transmission;
  }

  // Navegar para edição
  editVehicle(): void {
    if (this.vehicle) {
      this.router.navigate(['/vehicles', this.vehicle.id, 'edit']);
    }
  }

  // Remover veículo
  async removeVehicle(): Promise<void> {
    if (!this.vehicle) return;

    const confirmRemove = confirm(
      `Tem certeza que deseja remover o ${this.getVehicleFullName()}?\n\nEsta ação não pode ser desfeita.`
    );

    if (confirmRemove) {
      try {
        await this.vehicleService.removeVehicle(this.vehicle.id);
        console.log('Veículo removido com sucesso');
        
        // Mostrar mensagem de sucesso
        alert('Veículo removido com sucesso!');
        
        // Navegar de volta para dashboard
        this.router.navigate(['/dashboard']);
        
      } catch (error) {
        console.error('Erro ao remover veículo:', error);
        alert('Erro ao remover veículo. Tente novamente.');
      }
    }
  }

  // Duplicar veículo (criar cópia)
  duplicateVehicle(): void {
    if (!this.vehicle) return;

    const confirmDuplicate = confirm(
      `Deseja criar uma cópia do ${this.getVehicleFullName()}?`
    );

    if (confirmDuplicate) {
      // Navegar para add-vehicle com dados pré-preenchidos
      this.router.navigate(['/add-vehicle'], {
        queryParams: {
          duplicate: this.vehicle.id
        }
      });
    }
  }

  // Compartilhar veículo (simular)
  shareVehicle(): void {
    if (!this.vehicle) return;

    const shareText = `Confira meu ${this.getVehicleFullName()}!\n\n` +
                     `📅 Ano: ${this.vehicle.year}\n` +
                     `🎨 Cor: ${this.vehicle.color}\n` +
                     `🚗 Placa: ${this.vehicle.licensePlate}\n` +
                     `⛽ Combustível: ${this.getFuelDisplayName()}\n` +
                     `📏 Quilometragem: ${this.formatMileage(this.vehicle.mileage)}`;

    // Simular compartilhamento
    if (navigator.share) {
      navigator.share({
        title: `Meu ${this.getVehicleFullName()}`,
        text: shareText
      }).catch(console.error);
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Informações do veículo copiadas para a área de transferência!');
      }).catch(() => {
        alert('Não foi possível copiar as informações.');
      });
    }
  }

  // Voltar para dashboard
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Voltar para lista de veículos
  goToVehiclesList(): void {
    this.router.navigate(['/vehicles']);
  }

  // Adicionar manutenção (placeholder)
  addMaintenance(): void {
    alert('Funcionalidade de manutenções será implementada em breve!');
    // this.router.navigate(['/vehicles', this.vehicle?.id, 'maintenance', 'add']);
  }

  // Ver histórico de manutenções (placeholder)
  viewMaintenanceHistory(): void {
    alert('Histórico de manutenções será implementado em breve!');
    // this.router.navigate(['/vehicles', this.vehicle?.id, 'maintenance']);
  }

  // Adicionar gasto (placeholder)
  addExpense(): void {
    alert('Funcionalidade de gastos será implementada em breve!');
    // this.router.navigate(['/vehicles', this.vehicle?.id, 'expenses', 'add']);
  }

  // Ver histórico de gastos (placeholder)
  viewExpenseHistory(): void {
    alert('Histórico de gastos será implementado em breve!');
    // this.router.navigate(['/vehicles', this.vehicle?.id, 'expenses']);
  }
}