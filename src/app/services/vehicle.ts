// src/app/services/vehicle.ts - VERSÃO SIMPLIFICADA
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  fuel: string;
  mileage: number;
  engineSize?: string;
  transmission: string;
  doors: number;
  observations?: string;
  photo?: string;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  public vehicles$ = this.vehiclesSubject.asObservable();
  private unsubscribeSnapshot: (() => void) | null = null;

  constructor(private authService: AuthService) {
    this.initializeVehicleListener();
  }

  // ===== LISTENER E SINCRONIZAÇÃO =====
  private initializeVehicleListener(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.log('Usuário não logado - listener não iniciado');
      return;
    }

    console.log('🚗 Iniciando listener para:', currentUser.uid);

    const q = query(collection(db, 'vehicles'), where('userId', '==', currentUser.uid));

    this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()['createdAt']?.toDate() || new Date(),
        updatedAt: doc.data()['updatedAt']?.toDate()
      } as Vehicle));

      // Ordenar por data (mais recente primeiro)
      vehicles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('🔄 Veículos atualizados:', vehicles.length);
      this.vehiclesSubject.next(vehicles);
    }, (error) => {
      console.error('❌ Erro no listener:', error);
    });
  }

  private stopVehicleListener(): void {
    this.unsubscribeSnapshot?.();
    this.unsubscribeSnapshot = null;
  }

  reinitializeListener(): void {
    this.stopVehicleListener();
    this.initializeVehicleListener();
  }

  // ===== MÉTODOS DE ACESSO =====
  getVehicles = (): Observable<Vehicle[]> => this.vehicles$;
  getVehiclesSync = (): Vehicle[] => this.vehiclesSubject.value;
  getVehiclesByUser = (userId: string): Observable<Vehicle[]> => this.vehicles$; // Já filtrado
  getVehicleCount = (): number => this.vehiclesSubject.value.length;
  getVehicleCountByUser = (userId: string): number => this.vehiclesSubject.value.length;
  hasVehicles = (): boolean => this.vehiclesSubject.value.length > 0;
  userHasVehicles = (userId: string): boolean => this.vehiclesSubject.value.length > 0;

  getVehicleById(id: string): Vehicle | null {
    return this.vehiclesSubject.value.find(vehicle => vehicle.id === id) || null;
  }

  getLatestVehicle(): Vehicle | null {
    const vehicles = this.vehiclesSubject.value;
    return vehicles.length === 0 ? null : 
      vehicles.reduce((latest, current) => 
        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
      );
  }

  // ===== CRUD OPERATIONS =====
  async addVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('Usuário não autenticado');

    const newVehicleData = {
      ...vehicleData,
      userId: currentUser.uid,
      createdAt: new Date()
    };

    console.log('💾 Salvando veículo:', newVehicleData.brand, newVehicleData.model);

    try {
      const docRef = await addDoc(collection(db, 'vehicles'), newVehicleData);
      
      const savedVehicle: Vehicle = {
        id: docRef.id,
        ...newVehicleData
      };

      console.log('✅ Veículo salvo com ID:', docRef.id);
      return savedVehicle;
    } catch (error) {
      console.error('❌ Erro ao adicionar veículo:', error);
      throw error;
    }
  }

  async updateVehicle(id: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    if (!id) throw new Error('ID do veículo é obrigatório');

    const updateData = {
      ...vehicleData,
      updatedAt: new Date()
    };

    // Remover campos que não devem ser atualizados
    ['id', 'createdAt', 'userId'].forEach(field => delete (updateData as any)[field]);

    try {
      await updateDoc(doc(db, 'vehicles', id), updateData);

      const currentVehicles = this.vehiclesSubject.value;
      const vehicleIndex = currentVehicles.findIndex(v => v.id === id);
      
      if (vehicleIndex === -1) throw new Error('Veículo não encontrado');

      const updatedVehicle: Vehicle = {
        ...currentVehicles[vehicleIndex],
        ...updateData as Partial<Vehicle>
      };

      console.log('✅ Veículo atualizado:', id);
      return updatedVehicle;
    } catch (error) {
      console.error('❌ Erro ao atualizar veículo:', error);
      throw error;
    }
  }

  async removeVehicle(id: string): Promise<void> {
    if (!id) throw new Error('ID do veículo é obrigatório');

    try {
      await deleteDoc(doc(db, 'vehicles', id));
      console.log('✅ Veículo removido:', id);
    } catch (error) {
      console.error('❌ Erro ao remover veículo:', error);
      throw error;
    }
  }

  async clearAllVehicles(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const vehicles = this.vehiclesSubject.value;
    
    try {
      await Promise.all(vehicles.map(vehicle => 
        vehicle.id ? this.removeVehicle(vehicle.id) : Promise.resolve()
      ));
      console.log('🧹 Todos os veículos removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar veículos:', error);
    }
  }

  // ===== UTILITÁRIOS =====
  processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao processar imagem'));
      reader.readAsDataURL(file);
    });
  }

  getVehicleStats() {
    const vehicles = this.vehiclesSubject.value;
    const totalVehicles = vehicles.length;
    
    if (totalVehicles === 0) {
      return {
        total: 0,
        byFuel: {},
        byTransmission: {},
        averageYear: 0,
        newestYear: 0,
        oldestYear: 0
      };
    }

    // Agrupar por combustível e transmissão
    const byFuel = vehicles.reduce((acc, v) => {
      acc[v.fuel] = (acc[v.fuel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTransmission = vehicles.reduce((acc, v) => {
      acc[v.transmission] = (acc[v.transmission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcular estatísticas de anos
    const years = vehicles.map(v => v.year);
    const averageYear = Math.round(years.reduce((sum, year) => sum + year, 0) / years.length);

    return {
      total: totalVehicles,
      byFuel,
      byTransmission,
      averageYear,
      newestYear: Math.max(...years),
      oldestYear: Math.min(...years)
    };
  }

  // ===== MIGRAÇÃO =====
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const storedVehicles = localStorage.getItem('vehicles');
      if (!storedVehicles) {
        console.log('📭 Nenhum veículo para migrar');
        return;
      }

      const localVehicles = JSON.parse(storedVehicles);
      if (!Array.isArray(localVehicles) || localVehicles.length === 0) {
        console.log('📭 Dados inválidos no localStorage');
        return;
      }

      console.log(`🚚 Migrando ${localVehicles.length} veículos...`);

      for (const vehicle of localVehicles) {
        try {
          // Limpar campos desnecessários
          const { id, createdAt, updatedAt, ...vehicleToMigrate } = vehicle;
          
          await this.addVehicle(vehicleToMigrate);
          console.log('✅ Migrado:', vehicle.brand, vehicle.model);
        } catch (error) {
          console.error('❌ Erro na migração:', vehicle.brand, error);
        }
      }

      // Limpar localStorage após migração
      localStorage.removeItem('vehicles');
      console.log('🎉 Migração concluída!');
    } catch (error) {
      console.error('❌ Erro na migração:', error);
    }
  }
}