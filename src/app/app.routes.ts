// src/app/app.routes.ts - VERSÃO ATUALIZADA
import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { ForgotPassword } from './componentes/forgot-password/forgot-password';
import { Dashboard } from './componentes/dashboard/dashboard';
import { AddVehicle } from './componentes/add-vehicle/add-vehicle';
import { VehicleDetailsComponent } from './componentes/vehicle-details/vehicle-details';
import { MaintenanceComponent } from './componentes/maintenance/maintenance';
import { ExpensesComponent } from './componentes/expenses/expenses';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
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
    {
        path: 'vehicles/:id',
        component: VehicleDetailsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'vehicles/:id/edit',
        component: AddVehicle, 
        canActivate: [authGuard]
    },
    {
        path: 'maintenance',
        component: MaintenanceComponent,
        canActivate: [authGuard]
    },
    {
        path: 'expenses',
        component: ExpensesComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/login'
    }
];