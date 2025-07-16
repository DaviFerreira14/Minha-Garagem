// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { ForgotPassword } from './componentes/forgot-password/forgot-password';
import { Dashboard } from './componentes/dashboard/dashboard';
import { AddVehicle } from './componentes/add-vehicle/add-vehicle';
import { MaintenanceComponent } from './componentes/maintenance/maintenance';
import { authGuard } from './guards/auth-guard';
import { ExpensesComponent } from './componentes/expenses/expenses';

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
        path: 'maintenance',
        component: MaintenanceComponent,
        canActivate: [authGuard]
    },
    {
        path: 'expenses',
        component: ExpensesComponent
    },
    {
        path: '**',
        redirectTo: '/login'
    }
];