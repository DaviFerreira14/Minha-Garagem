import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Register } from './componentes/register/register';
import { Dashboard } from './componentes/dashboard/dashboard';
import { AddVehicle } from './componentes/add-vehicle/add-vehicle';
import { VehicleDetailsComponent } from './componentes/vehicle-details/vehicle-details';
import { EditVehicle } from './componentes/edit-vehicle/edit-vehicle';
import { MaintenanceComponent } from './componentes/maintenance/maintenance';
import { AddMaintenance } from './componentes/add-maintenance/add-maintenance';
import { EditMaintenance } from './componentes/edit-maintenance/edit-maintenance';
import { ExpensesComponent } from './componentes/expenses/expenses';
import { ForgotPassword } from './componentes/forgot-password/forgot-password';
import { TermsComponent } from './componentes/terms/terms';
import { PrivacyPolicyComponent } from './componentes/privacy-policy/privacy-policy';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'add-vehicle', component: AddVehicle, canActivate: [authGuard] },
  { path: 'vehicles/:id', component: VehicleDetailsComponent, canActivate: [authGuard] },
  { path: 'vehicles/:id/edit', component: EditVehicle, canActivate: [authGuard] },
  { path: 'maintenance', component: MaintenanceComponent, canActivate: [authGuard] },
  { path: 'add-maintenance', component: AddMaintenance, canActivate: [authGuard] },
  { path: 'maintenance/:id/edit', component: EditMaintenance, canActivate: [authGuard] },
  { path: 'expenses', component: ExpensesComponent, canActivate: [authGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: '**', redirectTo: '/login' }
];