import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MaintenanceService, Maintenance as MaintenanceModel } from '../../services/maintenance';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { MaintenanceReminderService } from '../../services/maintenance-reminder';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './maintenance.html',
  styleUrls: ['./maintenance.css']
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  maintenances: MaintenanceModel[] = [];
  filteredMaintenances: MaintenanceModel[] = [];
  vehicles: Vehicle[] = [];

  showDeleteConfirm = false;
  
  isLoadingMaintenances = true;
  isUpdating = false;
  isDeleting = false;

  successMessage = '';
  errorMessage = '';
  selectedVehicleFilter = '';
  selectedTypeFilter = '';

  maintenanceToDelete: MaintenanceModel | null = null;

  constructor(
    private router: Router,
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService,
    private reminderService: MaintenanceReminderService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.reminderService.startReminderSystem();
  }

  ngOnDestroy(): void {
    this.reminderService.stopReminderSystem();
  }

  private async loadData(): Promise<void> {
    try {
      await Promise.all([this.loadVehicles(), this.loadMaintenances()]);
    } catch (error) {
      this.errorMessage = 'Erro ao carregar dados';
    }
  }

  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  private async loadMaintenances(): Promise<void> {
    try {
      this.isLoadingMaintenances = true;
      this.maintenances = await this.maintenanceService.getUserMaintenances();
      this.filterMaintenances();
    } catch (error) {
      this.errorMessage = 'Erro ao carregar manutenções';
    } finally {
      this.isLoadingMaintenances = false;
    }
  }

  filterMaintenances(): void {
    let filtered = [...this.maintenances];

    if (this.selectedVehicleFilter) {
      filtered = filtered.filter(m => m.vehicleId === this.selectedVehicleFilter);
    }

    if (this.selectedTypeFilter) {
      filtered = filtered.filter(m => m.type === this.selectedTypeFilter);
    }

    this.filteredMaintenances = filtered;
  }

  goToAddMaintenance(): void {
    this.router.navigate(['/add-maintenance']);
  }

  goToEditMaintenance(maintenance: MaintenanceModel): void {
    this.router.navigate(['/maintenance', maintenance.id, 'edit']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  async markAsCompleted(maintenance: MaintenanceModel): Promise<void> {
    if (maintenance.type !== 'agendada') return;

    this.isUpdating = true;
    try {
      const result = await this.maintenanceService.updateMaintenance(maintenance.id!, {
        type: 'realizada' as const,
        date: new Date()
      });
      
      if (result.success) {
        this.successMessage = 'Manutenção marcada como realizada!';
        await this.loadMaintenances();
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao marcar manutenção como realizada';
    } finally {
      this.isUpdating = false;
    }
  }

  showDeleteModal(maintenance: MaintenanceModel): void {
    this.maintenanceToDelete = maintenance;
    this.showDeleteConfirm = true;
  }

  async confirmDelete(): Promise<void> {
    if (!this.maintenanceToDelete?.id) return;
    
    this.isDeleting = true;
    try {
      const result = await this.maintenanceService.deleteMaintenance(this.maintenanceToDelete.id);
      if (result.success) {
        this.successMessage = result.message;
        this.cancelDelete();
        await this.loadMaintenances();
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao deletar manutenção';
    } finally {
      this.isDeleting = false;
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.maintenanceToDelete = null;
    this.isDeleting = false;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}