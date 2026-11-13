import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, timeout } from 'rxjs';
import { Pagina } from '../../../../core/models/pagina';
import { mensajeError } from '../../../../core/utils/http-error';
import { idDesdeUrl, paginaDesdeUrl, tamanioDesdeUrl } from '../../../../core/utils/paginacion-url';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { EstadoVenta, FiltroVentas, Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

function estadoDesdeUrl(valor: unknown): EstadoVenta | null {
  return valor === 'REGISTRADA' || valor === 'ANULADA' ? valor : null;
}

function fechaDesdeUrl(valor: unknown): string | null {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}

@Component({
  selector: 'app-venta-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, SiPermiso, Paginador],
  templateUrl: './venta-list.html',
  styleUrl: './venta-list.css',
})
export class VentaList {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ventaService = inject(VentaService);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  readonly pagina = input(0, { transform: paginaDesdeUrl });
  readonly tamanio = input(20, { transform: tamanioDesdeUrl });
  readonly clienteId = input(null, { transform: idDesdeUrl });
  readonly estado = input(null, { transform: estadoDesdeUrl });
  readonly desde = input(null, { transform: fechaDesdeUrl });
  readonly hasta = input(null, { transform: fechaDesdeUrl });
  readonly dir = input('desc', { transform: (valor: unknown): 'asc' | 'desc' => valor === 'asc' ? 'asc' : 'desc' });
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly ahora = signal(new Date());
  private readonly errorLocal = signal<string | null>(null);
  protected readonly filtros = this.fb.group({
    clienteId: this.fb.control<number | null>(null),
    estado: this.fb.control<EstadoVenta | null>(null),
    desde: this.fb.control<string | null>(null),
    hasta: this.fb.control<string | null>(null),
  });
  private readonly consulta = rxResource({
    params: () => ({
      filtro: { clienteId: this.clienteId(), estado: this.estado(), desde: this.desde(), hasta: this.hasta() },
      pagina: this.pagina(), tamanio: this.tamanio(), dir: this.dir(),
    }),
    stream: ({ params }) => this.ventaService.buscar(params.filtro, params.pagina, params.tamanio, params.dir)
      .pipe(timeout({ first: 10000 })),
  });
  protected readonly resultado = linkedSignal<Pagina<Venta> | undefined, Pagina<Venta> | undefined>({
    source: () => this.consulta.hasValue() ? this.consulta.value() : undefined,
    computation: (nueva, previa) => nueva ?? previa?.value,
  });
  protected readonly cargando = this.consulta.isLoading;
  protected readonly error = computed(() => {
    const fallo = this.consulta.error();
    if (fallo instanceof TimeoutError) return 'El backend tardó más de 10 segundos en responder. Inténtalo otra vez.';
    if (fallo instanceof HttpErrorResponse) return mensajeError(fallo);
    return fallo ? 'No se pudieron cargar las ventas.' : this.errorLocal();
  });
  protected readonly totalPagina = computed(() =>
    (this.resultado()?.contenido ?? []).filter(venta => venta.estado === 'REGISTRADA')
      .reduce((suma, venta) => suma + venta.total, 0));

  constructor() {
    this.clienteService.listar(0, 100).pipe(takeUntilDestroyed()).subscribe({
      next: respuesta => this.clientes.set(Array.isArray(respuesta) ? respuesta : respuesta.contenido),
      error: (err: HttpErrorResponse) => this.errorLocal.set(mensajeError(err)),
    });
    effect(() => {
      this.filtros.setValue({
        clienteId: this.clienteId(), estado: this.estado(), desde: this.desde(), hasta: this.hasta(),
      }, { emitEvent: false });
      this.errorLocal.set(null);
    });
    this.filtros.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.buscar());
    effect(() => {
      if (!this.consulta.hasValue()) return;
      const respuesta = this.consulta.value();
      const ultima = Math.max(0, respuesta.totalPaginas - 1);
      if (respuesta.pagina > ultima) this.navegar({ pagina: ultima }, true);
    });
  }

  resumenFiltros(): string {
    const filtro = this.filtros.getRawValue();
    const cliente = this.clientes().find(item => item.id === filtro.clienteId);
    const partes = [
      cliente ? 'cliente ' + cliente.apellidos + ', ' + cliente.nombres : '',
      filtro.estado ? 'estado ' + filtro.estado : '',
      filtro.desde ? 'desde ' + filtro.desde : '',
      filtro.hasta ? 'hasta ' + filtro.hasta : '',
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : 'ninguno (todas las ventas)';
  }

  buscar(): void {
    const filtro: FiltroVentas = this.filtros.getRawValue();
    if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) {
      this.errorLocal.set('La fecha «desde» no puede ser posterior a la fecha «hasta».');
      return;
    }
    this.errorLocal.set(null);
    void this.router.navigate([], {
      queryParams: { ...filtro, pagina: 0, tamanio: this.tamanio(), orden: 'fecha', dir: this.dir() },
      queryParamsHandling: 'merge',
    }).then(cambio => { if (!cambio) this.consulta.reload(); });
  }

  limpiar(): void {
    this.filtros.reset({}, { emitEvent: false });
    this.buscar();
  }

  irA(pagina: number): void { this.navegar({ pagina }); }
  cambiarTamanio(tamanio: number): void { this.navegar({ tamanio, pagina: 0 }); }
  ordenarFecha(): void { this.navegar({ orden: 'fecha', dir: this.dir() === 'desc' ? 'asc' : 'desc', pagina: 0 }); }
  reintentar(): void { this.consulta.reload(); }

  private navegar(cambios: Record<string, string | number>, replaceUrl = false): void {
    void this.router.navigate([], { queryParams: cambios, queryParamsHandling: 'merge', replaceUrl });
  }

  imprimirConsulta(): void {
    this.ahora.set(new Date());
    setTimeout(() => window.print(), 100);
  }
}
