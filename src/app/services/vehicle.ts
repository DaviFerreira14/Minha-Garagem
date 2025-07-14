import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly STORAGE_KEY = 'vehicles';
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  public vehicles$ = this.vehiclesSubject.asObservable();

  constructor() {
    this.loadVehiclesFromStorage();
  }

  // Carregar veículos do localStorage
  private loadVehiclesFromStorage(): void {
    try {
      const storedVehicles = localStorage.getItem(this.STORAGE_KEY);
      if (storedVehicles) {
        const vehicles = JSON.parse(storedVehicles);
        this.vehiclesSubject.next(vehicles);
      }
    } catch (error) {
      console.error('Erro ao carregar veículos do storage:', error);
      this.vehiclesSubject.next([]);
    }
  }

  // Salvar veículos no localStorage
  private saveVehiclesToStorage(vehicles: Vehicle[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicles));
    } catch (error) {
      console.error('Erro ao salvar veículos no storage:', error);
    }
  }

  // Obter todos os veículos
  getVehicles(): Observable<Vehicle[]> {
    return this.vehicles$;
  }

  // Obter todos os veículos de forma síncrona
  getVehiclesSync(): Vehicle[] {
    return this.vehiclesSubject.value;
  }

  // Obter veículos por usuário
  getVehiclesByUser(userId: string): Observable<Vehicle[]> {
    return new Observable(observer => {
      this.vehicles$.subscribe(vehicles => {
        const userVehicles = vehicles.filter(vehicle => vehicle.userId === userId);
        observer.next(userVehicles);
      });
    });
  }

  // Obter veículo por ID
  getVehicleById(id: string): Vehicle | null {
    const vehicles = this.vehiclesSubject.value;
    return vehicles.find(vehicle => vehicle.id === id) || null;
  }

  // Adicionar novo veículo
  addVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    return new Promise((resolve, reject) => {
      try {
        const newVehicle: Vehicle = {
          ...vehicleData,
          id: this.generateId(),
          createdAt: new Date().toISOString()
        };

        const currentVehicles = this.vehiclesSubject.value;
        const updatedVehicles = [...currentVehicles, newVehicle];
        
        this.saveVehiclesToStorage(updatedVehicles);
        this.vehiclesSubject.next(updatedVehicles);
        
        console.log('Veículo adicionado com sucesso:', newVehicle);
        resolve(newVehicle);
      } catch (error) {
        console.error('Erro ao adicionar veículo:', error);
        reject(error);
      }
    });
  }

  // Atualizar veículo
  updateVehicle(id: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return new Promise((resolve, reject) => {
      try {
        const currentVehicles = this.vehiclesSubject.value;
        const vehicleIndex = currentVehicles.findIndex(v => v.id === id);
        
        if (vehicleIndex === -1) {
          reject(new Error('Veículo não encontrado'));
          return;
        }

        const updatedVehicle: Vehicle = {
          ...currentVehicles[vehicleIndex],
          ...vehicleData,
          updatedAt: new Date().toISOString()
        };

        const updatedVehicles = [...currentVehicles];
        updatedVehicles[vehicleIndex] = updatedVehicle;
        
        this.saveVehiclesToStorage(updatedVehicles);
        this.vehiclesSubject.next(updatedVehicles);
        
        resolve(updatedVehicle);
      } catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        reject(error);
      }
    });
  }

  // Remover veículo
  removeVehicle(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const currentVehicles = this.vehiclesSubject.value;
        const updatedVehicles = currentVehicles.filter(v => v.id !== id);
        
        this.saveVehiclesToStorage(updatedVehicles);
        this.vehiclesSubject.next(updatedVehicles);
        
        resolve();
      } catch (error) {
        console.error('Erro ao remover veículo:', error);
        reject(error);
      }
    });
  }

  // Gerar ID único
  private generateId(): string {
    return 'vehicle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Obter contagem de veículos
  getVehicleCount(): number {
    return this.vehiclesSubject.value.length;
  }

  // Obter contagem de veículos por usuário
  getVehicleCountByUser(userId: string): number {
    return this.vehiclesSubject.value.filter(v => v.userId === userId).length;
  }

  // Limpar todos os veículos (para desenvolvimento/teste)
  clearAllVehicles(): void {
    this.vehiclesSubject.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Verificar se há veículos
  hasVehicles(): boolean {
    return this.vehiclesSubject.value.length > 0;
  }

  // Verificar se usuário tem veículos
  userHasVehicles(userId: string): boolean {
    return this.vehiclesSubject.value.some(v => v.userId === userId);
  }

  // Processar arquivo de imagem para base64
  processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        resolve(e.target.result);
      };
      reader.onerror = () => {
        reject(new Error('Erro ao processar imagem'));
      };
      reader.readAsDataURL(file);
    });
  }

  // Obter veículo mais recente
  getLatestVehicle(): Vehicle | null {
    const vehicles = this.vehiclesSubject.value;
    if (vehicles.length === 0) return null;
    
    return vehicles.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });
  }

  // Obter estatísticas básicas
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

    const byFuel = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.fuel] = (acc[vehicle.fuel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTransmission = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.transmission] = (acc[vehicle.transmission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const years = vehicles.map(v => v.year);
    const averageYear = Math.round(years.reduce((sum, year) => sum + year, 0) / years.length);
    const newestYear = Math.max(...years);
    const oldestYear = Math.min(...years);

    return {
      total: totalVehicles,
      byFuel,
      byTransmission,
      averageYear,
      newestYear,
      oldestYear
    };
  }
}