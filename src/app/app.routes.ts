import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { Dashboard } from './componentes/dashboard/dashboard';
import { authGuard } from './guards/auth-guard';
import { ForgotPassword } from './componentes/forgot-password/forgot-password';
import { AddVehicle } from './componentes/add-vehicle/add-vehicle';

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
        path: 'add-vehicle',
        component: AddVehicle,
        canActivate: [authGuard]
    },
    {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/login'
    }
];