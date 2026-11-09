import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth-service';

@Component({
  selector: 'app-aviso-sesion',
  templateUrl: './aviso-sesion.html',
  styleUrl: './aviso-sesion.css',
})
export class AvisoSesion {
  private readonly auth = inject(AuthService);
  protected readonly oculto = signal(false);
  protected readonly visible = this.auth.porVencer;

  constructor() {
    effect(() => {
      this.auth.sesion();
      this.oculto.set(false);
    });
  }

  protected cerrar(): void {
    this.oculto.set(true);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

  protected tiempo(): string {
    const total = this.auth.segundosRestantes();
    const minutos = Math.floor(total / 60).toString().padStart(2, '0');
    const segundos = (total % 60).toString().padStart(2, '0');
    return `${minutos}:${segundos}`;
  }
}
