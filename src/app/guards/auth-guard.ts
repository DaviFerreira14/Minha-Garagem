import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { map, switchMap, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
 const authService = inject(AuthService);
 const router = inject(Router);

 return authService.authStateInitialized$.pipe(
   take(1),
   switchMap(() => {
     return authService.currentUser$.pipe(
       take(1),
       map(user => {
         if (user) {
           return true;
         } else {
           router.navigate(['/login']);
           return false;
         }
       })
     );
   })
 );
};
