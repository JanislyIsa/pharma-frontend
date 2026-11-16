import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Permiso, Sesion } from './auth.model';

const CLAVE_SESION = 'pharmasoft.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;
  private sesionExpiradaAlCargar = false;
  private readonly sesionActual = signal<Sesion | null>(this.leerSesionGuardada());
  private temporizador?: ReturnType<typeof setInterval>;

  readonly sesion = this.sesionActual.asReadonly();
  readonly segundosRestantes = signal(0);
  readonly autenticado = computed(() => {
    const sesion = this.sesionActual();
    return sesion !== null && Date.now() < sesion.expiraEn;
  });
  readonly porVencer = computed(() => this.autenticado() && this.segundosRestantes() <= 120);

  constructor() {
    const sesion = this.sesionActual();
    if (sesion) this.programarExpiracion(sesion);
  }

  login(credenciales: LoginRequest): Observable<Sesion> {
    return this.http.post<LoginResponse>(`${this.url}/login`, credenciales).pipe(
      map((respuesta) => ({
        token: respuesta.token,
        expiraEn: Date.now() + respuesta.expiraEnSegundos * 1000,
        username: respuesta.username,
        nombreCompleto: respuesta.nombreCompleto,
        roles: respuesta.roles,
        permisos: respuesta.permisos,
      })),
      tap((sesion) => this.iniciar(sesion)),
    );
  }

  cerrarSesion(motivo?: 'expirada', volverA?: string): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
    this.segundosRestantes.set(0);
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesionActual.set(null);

    const queryParams: Record<string, string> = {};
    if (motivo) queryParams['expirada'] = '1';
    if (this.esRutaInterna(volverA) && volverA !== '/login') {
      queryParams['returnUrl'] = volverA;
    }
    void this.router.navigate(['/login'], { queryParams });
  }

  token(): string | null {
    const sesion = this.sesionActual();
    return sesion && Date.now() < sesion.expiraEn ? sesion.token : null;
  }

  huboSesionExpiradaAlCargar(): boolean {
    return this.sesionExpiradaAlCargar;
  }

  tienePermiso(permiso: Permiso): boolean {
    return this.sesionActual()?.permisos.includes(permiso) ?? false;
  }

  private iniciar(sesion: Sesion): void {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesionActual.set(sesion);
    this.programarExpiracion(sesion);
  }

  private programarExpiracion(sesion: Sesion): void {
    if (this.temporizador) clearInterval(this.temporizador);
    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((sesion.expiraEn - Date.now()) / 1000));
      this.segundosRestantes.set(restante);
      if (restante === 0) this.cerrarSesion('expirada', this.router.url);
    };
    actualizar();
    if (this.sesionActual() === sesion) {
      this.temporizador = setInterval(actualizar, 1000);
    }
  }

  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as Sesion;
      if (!sesion.token || !Number.isFinite(sesion.expiraEn) || Date.now() >= sesion.expiraEn) {
        this.sesionExpiradaAlCargar = Date.now() >= sesion.expiraEn;
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }

  private esRutaInterna(ruta: string | undefined): ruta is string {
    return !!ruta && ruta.startsWith('/') && !ruta.startsWith('//');
  }
}
