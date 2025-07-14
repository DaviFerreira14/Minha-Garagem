import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { Dashboard } from './componentes/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './componentes/forgot-password/forgot-password';
import { AddVehicle } from './componentes/add-vehicle/add-vehicle';
import { VehicleDetails } from './componentes/vehicle-details/vehicle-details';
import { EditVehicle } from './componentes/edit-vehicle/edit-vehicle';

export const routes: Routes = [
    // Rota padrão - redirecionar para login
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    
    // Rotas de autenticação (não protegidas)
    {
        path: 'login',
        component: Login
    },
    {
        path: 'register',
        component: Register
    },
    {
        path: 'forgot-password',
        component: ForgotPassword
    },
    
    // Rotas protegidas por authGuard
    {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard]
    },
    {
        path: 'add-vehicle',
        component: AddVehicle,
        canActivate: [authGuard]
    },
    
    // Rotas de veículos
    {
        path: 'vehicles/:id',
        component: VehicleDetails,
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/edit',
        component: EditVehicle,
        canActivate: [authGuard]
    },
    
    // Rotas futuras (implementar conforme necessário)
    /*
    {
        path: 'vehicles',
        loadComponent: () => import('./componentes/vehicles-list/vehicles-list').then(m => m.VehiclesList),
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/maintenance',
        loadComponent: () => import('./componentes/maintenance/maintenance').then(m => m.Maintenance),
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/maintenance/add',
        loadComponent: () => import('./componentes/add-maintenance/add-maintenance').then(m => m.AddMaintenance),
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/expenses',
        loadComponent: () => import('./componentes/expenses/expenses').then(m => m.Expenses),
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/expenses/add',
        loadComponent: () => import('./componentes/add-expense/add-expense').then(m => m.AddExpense),
        canActivate: [authGuard]
    },
    {
        path: 'maintenance',
        loadComponent: () => import('./componentes/maintenance-list/maintenance-list').then(m => m.MaintenanceList),
        canActivate: [authGuard]
    },
    {
        path: 'expenses',
        loadComponent: () => import('./componentes/expenses-list/expenses-list').then(m => m.ExpensesList),
        canActivate: [authGuard]
    },
    {
        path: 'profile',
        loadComponent: () => import('./componentes/profile/profile').then(m => m.Profile),
        canActivate: [authGuard]
    },
    {
        path: 'settings',
        loadComponent: () => import('./componentes/settings/settings').then(m => m.Settings),
        canActivate: [authGuard]
    },
    */
    
    // Rota 404 - página não encontrada
    {
        path: '**',
        redirectTo: '/login'
    }
];