import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

export interface MaintenanceItem {
  id?: string;
  description: string;
  cost: number;
}

export interface Maintenance {
  id?: string;
  userId: string;
  vehicleId: string;
  vehicleName: string;
  type: 'realizada' | 'agendada';
  date: Date;
  title: string;
  items: MaintenanceItem[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  constructor(private authService: AuthService) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'Erro desconhecido';
  }

  async addMaintenance(maintenance: Omit<Maintenance, 'id' | 'userId' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const maintenanceData: Omit<Maintenance, 'id'> = {
        ...maintenance,
        userId: currentUser.uid,
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'maintenances'), maintenanceData);
      return { success: true, message: 'Manutenção adicionada com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao adicionar manutenção: ' + this.getErrorMessage(error) };
    }
  }

  async getUserMaintenances(): Promise<Maintenance[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return [];

      const q = query(
        collection(db, 'maintenances'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date'].toDate(),
          createdAt: data['createdAt'].toDate()
        } as Maintenance;
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar manutenções:', error);
      return [];
    }
  }

  async getVehicleMaintenances(vehicleId: string): Promise<Maintenance[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return [];

      const q = query(
        collection(db, 'maintenances'),
        where('userId', '==', currentUser.uid),
        where('vehicleId', '==', vehicleId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date'].toDate(),
          createdAt: data['createdAt'].toDate()
        } as Maintenance;
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar manutenções do veículo:', error);
      return [];
    }
  }

  async updateMaintenance(maintenanceId: string, updates: Partial<Maintenance>): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const maintenanceRef = doc(db, 'maintenances', maintenanceId);
      const maintenanceSnap = await getDoc(maintenanceRef);
      
      if (!maintenanceSnap.exists()) {
        return { success: false, message: 'Manutenção não encontrada' };
      }

      const maintenanceData = maintenanceSnap.data();
      if (maintenanceData['userId'] !== currentUser.uid) {
        return { success: false, message: 'Você não tem permissão para editar esta manutenção' };
      }

      await updateDoc(maintenanceRef, updates);
      return { success: true, message: 'Manutenção atualizada com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao atualizar manutenção: ' + this.getErrorMessage(error) };
    }
  }

  async deleteMaintenance(maintenanceId: string): Promise<{ success: boolean; message: string }> {
    try {
      await deleteDoc(doc(db, 'maintenances', maintenanceId));
      return { success: true, message: 'Manutenção removida com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao remover manutenção: ' + this.getErrorMessage(error) };
    }
  }

  calculateTotalMaintenanceCost(maintenances: Maintenance[]): number {
    return maintenances.reduce((total, maintenance) => total + maintenance.totalCost, 0);
  }

  groupMaintenancesByVehicle(maintenances: Maintenance[]): { [vehicleId: string]: Maintenance[] } {
    return maintenances.reduce((groups, maintenance) => {
      const vehicleId = maintenance.vehicleId;
      if (!groups[vehicleId]) groups[vehicleId] = [];
      groups[vehicleId].push(maintenance);
      return groups;
    }, {} as { [vehicleId: string]: Maintenance[] });
  }

  async getMaintenanceStats(): Promise<{
    total: number;
    thisMonth: number;
    upcoming: number;
    totalCost: number;
  }> {
    try {
      const maintenances = await this.getUserMaintenances();
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const thisMonthMaintenances = maintenances.filter(m => 
        m.date >= thisMonth && m.date < nextMonth
      );

      const upcomingMaintenances = maintenances.filter(m => 
        m.type === 'agendada' && m.date > now
      );

      return {
        total: maintenances.length,
        thisMonth: thisMonthMaintenances.length,
        upcoming: upcomingMaintenances.length,
        totalCost: this.calculateTotalMaintenanceCost(maintenances)
      };
    } catch (error: unknown) {
      console.error('Erro ao obter estatísticas de manutenção:', error);
      return { total: 0, thisMonth: 0, upcoming: 0, totalCost: 0 };
    }
  }

  async getUpcomingMaintenances(days: number = 30): Promise<Maintenance[]> {
    try {
      const maintenances = await this.getUserMaintenances();
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      return maintenances.filter(m => 
        m.type === 'agendada' && 
        m.date >= now && 
        m.date <= futureDate
      ).sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error: unknown) { 
      console.error('Erro ao buscar manutenções próximas:', error);
      return [];
    }
  }

  async getMaintenanceHistory(startDate: Date, endDate: Date): Promise<Maintenance[]> {
    try {
      const maintenances = await this.getUserMaintenances();
      
      return maintenances.filter(m => 
        m.date >= startDate && m.date <= endDate
      ).sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error: unknown) { 
      console.error('Erro ao buscar histórico de manutenções:', error);
      return [];
    }
  }
}