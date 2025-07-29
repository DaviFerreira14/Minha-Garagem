import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
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
    this.authService.currentUser$.subscribe(user => {
      user ? this.startListening(user.uid) : this.stopListening();
    });
  }

  private startListening(userId: string): void {
    this.stopListening();
    
    const q = query(
      collection(db, 'vehicles'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate()
        } as Vehicle;
      });
      this.vehiclesSubject.next(vehicles);
    });
  }

  private stopListening(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.vehiclesSubject.next([]);
  }

  getVehicles(): Observable<Vehicle[]> {
    return this.vehicles$;
  }

  getVehicleById(id: string): Vehicle | null {
    return this.vehiclesSubject.value.find(v => v.id === id) || null;
  }

  async addVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('Usuário não autenticado');

    const newVehicleData = {
      ...vehicleData,
      userId: currentUser.uid,
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'vehicles'), newVehicleData);
    return { id: docRef.id, ...newVehicleData };
  }

  async updateVehicle(id: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const updateData = { ...vehicleData, updatedAt: new Date() };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;
    delete (updateData as any).userId;

    await updateDoc(doc(db, 'vehicles', id), updateData);
    const vehicle = this.getVehicleById(id);
    return { ...vehicle!, ...updateData as Partial<Vehicle> };
  }

  async removeVehicle(id: string): Promise<void> {
    await deleteDoc(doc(db, 'vehicles', id));
  }

  async clearAllVehicles(): Promise<void> {
    const vehicles = this.vehiclesSubject.value;
    await Promise.all(vehicles.map(vehicle => this.removeVehicle(vehicle.id)));
  }

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
    const total = vehicles.length;
    
    if (total === 0) {
      return { total: 0, byFuel: {}, byTransmission: {}, averageYear: 0 };
    }

    const byFuel = vehicles.reduce((acc, v) => {
      acc[v.fuel] = (acc[v.fuel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTransmission = vehicles.reduce((acc, v) => {
      acc[v.transmission] = (acc[v.transmission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageYear = Math.round(vehicles.reduce((sum, v) => sum + v.year, 0) / total);

    return { total, byFuel, byTransmission, averageYear };
  }

  reinitializeListener(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) this.startListening(currentUser.uid);
  }

  async migrateFromLocalStorage(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const stored = localStorage.getItem('vehicles');
    if (!stored) return;

    try {
      const localVehicles = JSON.parse(stored);
      if (Array.isArray(localVehicles)) {
        await Promise.all(localVehicles.map(vehicle => {
          const { id, createdAt, updatedAt, ...vehicleData } = vehicle;
          return this.addVehicle({ ...vehicleData, userId: currentUser.uid });
        }));
        localStorage.removeItem('vehicles');
      }
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  }
}