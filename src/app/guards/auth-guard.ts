// src/app/guards/auth-guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { map, switchMap, take } from 'rxjs/operators'; // Adicione 'take' e 'switchMap'
import { of } from 'rxjs'; // Adicione 'of' para Observables

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Primeiro, aguarda que o estado de autenticação seja inicializado
  return authService.authStateInitialized$.pipe(
    take(1), // Pega a primeira emissão de que o estado foi inicializado
    switchMap(() => {
      // Uma vez que o estado foi inicializado, então verifica o usuário atual
      return authService.currentUser$.pipe(
        take(1), // Pega a primeira (e mais atual) emissão do usuário
        map(user => {
          if (user) {
            console.log('AuthGuard: Usuário logado. Acesso permitido.');
            return true;
          } else {
            console.log('AuthGuard: Usuário não logado. Redirecionando para /login.');
            router.navigate(['/login']);
            return false;
          }
        })
      );
    })
  );
};