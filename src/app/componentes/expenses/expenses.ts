import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ExpenseService, Expense, ExpenseCategory, ExpenseSummary } from '../../services/expense';
import { VehicleService, Vehicle } from '../../services/vehicle';
import { AuthService } from '../../services/auth';
import { NavbarComponent } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './expenses.html',
  styleUrls: ['./expenses.css']
})
export class ExpensesComponent implements OnInit {
  expenseForm!: FormGroup;
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  vehicles: Vehicle[] = [];
  categories: ExpenseCategory[] = [];
  
  showAddForm = false;
  isLoading = false;
  isLoadingExpenses = true;
  successMessage = '';
  errorMessage = '';
  
  showDeleteConfirm = false;
  expenseToDelete: Expense | null = null;
  isDeleting = false;
  
  selectedVehicleFilter = '';
  selectedCategoryFilter = '';
  selectedPeriodFilter = 'month';
  selectedMonth = '';
  selectedYear = '';
  
  expenseSummary: ExpenseSummary | null = null;
  minDate = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private expenseService: ExpenseService,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
    this.loadVehicles();
    this.loadExpenses();
    this.setMinDate();
    this.initializeDateFilters();
  }

  private initializeForm(): void {
    this.expenseForm = this.formBuilder.group({
      vehicleId: ['', Validators.required],
      category: ['', Validators.required],
      subcategory: [''],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: ['', Validators.required],
      odometer: [0, [Validators.min(0)]],
      notes: ['']
    });

    this.expenseForm.get('category')?.valueChanges.subscribe(categoryId => {
      this.onCategoryChange(categoryId);
    });
  }

  private setMinDate(): void {
    this.minDate = new Date().toISOString().split('T')[0];
  }

  private initializeDateFilters(): void {
    const now = new Date();
    this.selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(now.getFullYear());
  }

  private loadCategories(): void {
    this.categories = this.expenseService.getCategories();
  }

  async loadVehicles(): Promise<void> {
    try {
      this.vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    } catch (error) {
      this.errorMessage = 'Erro ao carregar veículos';
    }
  }

  async loadExpenses(): Promise<void> {
    try {
      this.isLoadingExpenses = true;
      this.expenses = await this.expenseService.getUserExpenses();
      this.filterExpenses();
      this.calculateSummary();
    } catch (error) {
      this.errorMessage = 'Erro ao carregar gastos';
    } finally {
      this.isLoadingExpenses = false;
    }
  }

  onCategoryChange(categoryId: string): void {
    this.expenseForm.get('subcategory')?.setValue('');
    const subcategoryControl = this.expenseForm.get('subcategory');
    if (subcategoryControl) {
      subcategoryControl.clearValidators();
      subcategoryControl.updateValueAndValidity();
    }
  }

  getSubcategories(categoryId: string): string[] {
    return this.categories.find(cat => cat.id === categoryId)?.subcategories || [];
  }

  getCategoryById(categoryId: string): ExpenseCategory | undefined {
    return this.categories.find(cat => cat.id === categoryId);
  }

  filterExpenses(): void {
    let filtered = [...this.expenses];

    if (this.selectedVehicleFilter) {
      filtered = filtered.filter(expense => expense.vehicleId === this.selectedVehicleFilter);
    }

    if (this.selectedCategoryFilter) {
      filtered = filtered.filter(expense => expense.category === this.selectedCategoryFilter);
    }

    filtered = this.filterByPeriod(filtered);
    this.filteredExpenses = filtered;
    this.calculateSummary();
  }

  private filterByPeriod(expenses: Expense[]): Expense[] {
    const now = new Date();
    
    switch (this.selectedPeriodFilter) {
      case 'day':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= today && expenseDate < tomorrow;
        });

      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
        });

      case 'month':
        const selectedMonthNum = parseInt(this.selectedMonth) - 1;
        const selectedYearNum = parseInt(this.selectedYear);
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === selectedMonthNum && 
                 expenseDate.getFullYear() === selectedYearNum;
        });

      case 'year':
        const selectedYearForFilter = parseInt(this.selectedYear);
        return expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === selectedYearForFilter;
        });

      default:
        return expenses;
    }
  }

  private calculateSummary(): void {
    this.expenseSummary = this.expenseService.calculateExpenseSummary(this.filteredExpenses);
  }

  async onSubmit(): Promise<void> {
    if (this.expenseForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const formValue = this.expenseForm.value;
        const selectedVehicle = this.vehicles.find(v => v.id === formValue.vehicleId);
        
        if (!selectedVehicle) {
          this.errorMessage = 'Veículo não encontrado';
          return;
        }

        const [year, month, day] = formValue.date.split('-').map(Number);
        const correctDate = new Date(year, month - 1, day, 12, 0, 0, 0);

        const expense: Omit<Expense, 'id' | 'userId' | 'createdAt'> = {
          vehicleId: formValue.vehicleId,
          vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})`,
          category: formValue.category,
          subcategory: formValue.subcategory || '',
          description: formValue.description.trim(),
          amount: Number(formValue.amount),
          date: correctDate,
          odometer: formValue.odometer ? Number(formValue.odometer) : undefined,
          notes: formValue.notes?.trim() || ''
        };

        const result = await this.expenseService.addExpense(expense);

        if (result.success) {
          this.successMessage = result.message;
          this.resetForm();
          this.showAddForm = false;
          await this.loadExpenses();
        } else {
          this.errorMessage = result.message;
        }
      } catch (error) {
        this.errorMessage = 'Erro inesperado ao salvar gasto';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.expenseForm);
      this.errorMessage = 'Por favor, corrija os erros no formulário';
    }
  }

  showDeleteModal(expense: Expense): void {
    this.expenseToDelete = expense;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.expenseToDelete = null;
    this.isDeleting = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.expenseToDelete?.id) return;
    
    this.isDeleting = true;
    try {
      const result = await this.expenseService.deleteExpense(this.expenseToDelete.id);
      if (result.success) {
        this.successMessage = result.message;
        this.showDeleteConfirm = false;
        this.expenseToDelete = null;
        await this.loadExpenses();
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erro ao deletar gasto';
    } finally {
      this.isDeleting = false;
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (expense) {
      this.showDeleteModal(expense);
    }
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  private resetForm(): void {
    this.expenseForm.reset();
    this.initializeForm();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  getPeriodDisplayName(): string {
    switch (this.selectedPeriodFilter) {
      case 'day': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return `${this.getMonthName(this.selectedMonth)}/${this.selectedYear}`;
      case 'year': return this.selectedYear;
      default: return 'Período Selecionado';
    }
  }

  private getMonthName(month: string): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[parseInt(month) - 1] || month;
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}