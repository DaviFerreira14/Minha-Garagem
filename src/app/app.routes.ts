import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { Dashboard } from './componentes/dashboard/dashboard';
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
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/login'
    }
];