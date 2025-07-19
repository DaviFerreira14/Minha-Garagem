import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

export interface Expense {
  id?: string;
  userId: string;
  vehicleId: string;
  vehicleName: string;
  category: 'maintenance' | 'fuel' | 'energy' | 'labor' | 'insurance' | 'tax' | 'other';
  subcategory?: string;
  description: string;
  amount: number;
  date: Date;
  odometer?: number;
  notes?: string;
  createdAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: string[];
}

export interface ExpenseSummary {
  totalAmount: number;
  totalExpenses: number;
  averagePerExpense: number;
  categoryBreakdown: { [category: string]: number };
  periodComparison?: {
    current: number;
    previous: number;
    percentageChange: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private readonly categories: ExpenseCategory[] = [
    {
      id: 'fuel',
      name: 'Combustível',
      icon: 'fas fa-gas-pump',
      color: '#007bff',
      subcategories: ['Gasolina', 'Etanol', 'Diesel', 'GNV']
    },
    {
      id: 'energy',
      name: 'Energia/Recarga',
      icon: 'fas fa-charging-station',
      color: '#28a745',
      subcategories: ['Recarga Elétrica', 'Energia Domiciliar']
    },
    {
      id: 'maintenance',
      name: 'Manutenção',
      icon: 'fas fa-wrench',
      color: '#ffc107',
      subcategories: ['Óleo', 'Filtros', 'Pneus', 'Freios', 'Revisão', 'Peças']
    },
    {
      id: 'labor',
      name: 'Mão de Obra',
      icon: 'fas fa-user-cog',
      color: '#fd7e14',
      subcategories: ['Mecânico', 'Elétrico', 'Funilaria', 'Pintura']
    },
    {
      id: 'insurance',
      name: 'Seguro',
      icon: 'fas fa-shield-alt',
      color: '#6f42c1',
      subcategories: ['Seguro Total', 'Seguro Terceiros', 'Assistência']
    },
    {
      id: 'tax',
      name: 'Impostos/Taxas',
      icon: 'fas fa-file-invoice-dollar',
      color: '#dc3545',
      subcategories: ['IPVA', 'Licenciamento', 'DPVAT', 'Multas']
    },
    {
      id: 'other',
      name: 'Outros',
      icon: 'fas fa-ellipsis-h',
      color: '#6c757d',
      subcategories: ['Estacionamento', 'Pedágio', 'Lavagem', 'Acessórios']
    }
  ];

  constructor(private authService: AuthService) {}

  getCategories(): ExpenseCategory[] {
    return this.categories;
  }

  getCategoryById(categoryId: string): ExpenseCategory | undefined {
    return this.categories.find(cat => cat.id === categoryId);
  }

  async addExpense(expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const expenseData: Omit<Expense, 'id'> = {
        ...expense,
        userId: currentUser.uid,
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'expenses'), expenseData);
      return { success: true, message: 'Gasto adicionado com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao adicionar gasto: ' + this.getErrorMessage(error) };
    }
  }

  async getUserExpenses(): Promise<Expense[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return [];

      const q = query(
        collection(db, 'expenses'),
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
        } as Expense;
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar gastos:', error);
      return [];
    }
  }

  async getVehicleExpenses(vehicleId: string): Promise<Expense[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return [];

      const q = query(
        collection(db, 'expenses'),
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
        } as Expense;
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar gastos do veículo:', error);
      return [];
    }
  }

  async getExpensesByPeriod(
    startDate: Date, 
    endDate: Date, 
    vehicleId?: string, 
    category?: string
  ): Promise<Expense[]> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return [];

      let q = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid)
      );

      if (vehicleId) q = query(q, where('vehicleId', '==', vehicleId));
      if (category) q = query(q, where('category', '==', category));
      
      q = query(q, orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      const allExpenses = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date'].toDate(),
          createdAt: data['createdAt'].toDate()
        } as Expense;
      });

      return allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar gastos por período:', error);
      return [];
    }
  }

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<{ success: boolean; message: string }> {
    try {
      await updateDoc(doc(db, 'expenses', expenseId), updates);
      return { success: true, message: 'Gasto atualizado com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao atualizar gasto: ' + this.getErrorMessage(error) };
    }
  }

  async deleteExpense(expenseId: string): Promise<{ success: boolean; message: string }> {
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      return { success: true, message: 'Gasto removido com sucesso!' };
    } catch (error: unknown) {
      return { success: false, message: 'Erro ao remover gasto: ' + this.getErrorMessage(error) };
    }
  }

  calculateExpenseSummary(expenses: Expense[]): ExpenseSummary {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpenses = expenses.length;
    const averagePerExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    const categoryBreakdown: { [category: string]: number } = {};
    this.categories.forEach(cat => categoryBreakdown[cat.id] = 0);

    expenses.forEach(expense => {
      if (categoryBreakdown.hasOwnProperty(expense.category)) {
        categoryBreakdown[expense.category] += expense.amount;
      }
    });

    return { totalAmount, totalExpenses, averagePerExpense, categoryBreakdown };
  }

  calculatePeriodComparison(currentExpenses: Expense[], previousExpenses: Expense[]): ExpenseSummary {
    const currentSummary = this.calculateExpenseSummary(currentExpenses);
    const previousTotal = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const percentageChange = previousTotal > 0 
      ? ((currentSummary.totalAmount - previousTotal) / previousTotal) * 100 
      : 0;

    return {
      ...currentSummary,
      periodComparison: {
        current: currentSummary.totalAmount,
        previous: previousTotal,
        percentageChange
      }
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Erro desconhecido';
  }

  async getCurrentMonthExpenses(): Promise<Expense[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return this.getExpensesByPeriod(startOfMonth, endOfMonth);
  }

  async getCurrentWeekExpenses(): Promise<Expense[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return this.getExpensesByPeriod(startOfWeek, endOfWeek);
  }

  async getTodayExpenses(): Promise<Expense[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return this.getExpensesByPeriod(startOfDay, endOfDay);
  }
}