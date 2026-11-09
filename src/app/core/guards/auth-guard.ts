import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.autenticado() && auth.token()) return true;
  const queryParams: Record<string, string> = { returnUrl: state.url };
  if (auth.huboSesionExpiradaAlCargar()) queryParams['expirada'] = '1';
  return inject(Router).createUrlTree(['/login'], { queryParams });
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado()
    ? inject(Router).createUrlTree(['/inicio'])
    : true;
};
