import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ProductoMasVendido {
  productoId: number;
  productoNombre: string;
  cantidadVendida: number;
  montoTotal: number;
}

@Component({
  selector: 'app-mas-vendidos',
  imports: [CurrencyPipe],
  templateUrl: './mas-vendidos.html',
})
export class MasVendidos {
  private readonly http = inject(HttpClient);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly filas = toSignal(
    this.http.get<ProductoMasVendido[]>(`${environment.apiUrl}/reportes/productos-mas-vendidos`).pipe(
      catchError(() => {
        this.error.set(true);
        return of([] as ProductoMasVendido[]);
      }),
      finalize(() => this.cargando.set(false)),
    ),
    { initialValue: [] as ProductoMasVendido[] },
  );
}
