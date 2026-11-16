import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Pagina } from '../../../../core/models/pagina';
import { mensajeError } from '../../../../core/utils/http-error';
import { direccionDesdeUrl, idDesdeUrl, paginaDesdeUrl, tamanioDesdeUrl } from '../../../../core/utils/paginacion-url';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { OrdenProducto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';

function ordenDesdeUrl(valor: unknown): OrdenProducto {
  return valor === 'id' || valor === 'precio' || valor === 'stock' ? valor : 'nombre';
}

@Component({
  selector: 'app-producto-list',
  imports: [RouterLink, CurrencyPipe, SiPermiso, Paginador],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly router = inject(Router);
  readonly pagina = input(0, { transform: paginaDesdeUrl });
  readonly tamanio = input(20, { transform: tamanioDesdeUrl });
  readonly orden = input('nombre', { transform: ordenDesdeUrl });
  readonly dir = input('asc', { transform: direccionDesdeUrl });
  readonly categoriaId = input(null, { transform: idDesdeUrl });
  protected readonly categorias = signal<Categoria[]>([]);
  private readonly errorCategorias = signal('');
  private readonly consulta = rxResource({
    params: () => ({
      pagina: this.pagina(), tamanio: this.tamanio(),
      ordenarPor: this.orden(), direccion: this.dir(),
    }),
    stream: ({ params }) => this.productoService.listar(params),
  });
  protected readonly resultado = linkedSignal<Pagina<Producto> | undefined, Pagina<Producto> | undefined>({
    source: () => this.consulta.hasValue() ? this.consulta.value() : undefined,
    computation: (nueva, previa) => nueva ?? previa?.value,
  });
  protected readonly cargando = this.consulta.isLoading;
  protected readonly error = computed(() => {
    const fallo = this.consulta.error();
    if (fallo instanceof HttpErrorResponse) return mensajeError(fallo);
    return fallo ? 'No se pudieron cargar los productos.' : this.errorCategorias();
  });
  protected readonly productos = computed(() => {
    const lista = this.resultado()?.contenido ?? [];
    return this.categoriaId() === null ? lista : lista.filter(producto => producto.categoriaId === this.categoriaId());
  });

  constructor() {
    this.categoriaService.listar().pipe(takeUntilDestroyed()).subscribe({
      next: categorias => this.categorias.set(categorias),
      error: (err: HttpErrorResponse) => this.errorCategorias.set(mensajeError(err)),
    });
    effect(() => {
      if (!this.consulta.hasValue()) return;
      const respuesta = this.consulta.value();
      const ultima = Math.max(0, respuesta.totalPaginas - 1);
      if (respuesta.pagina > ultima) this.navegar({ pagina: ultima }, true);
    });
  }

  cargar(): void {
    this.consulta.reload();
  }

  cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  ordenar(campo: OrdenProducto): void {
    const dir = this.orden() === campo && this.dir() === 'asc' ? 'desc' : 'asc';
    this.navegar({ orden: campo, dir, pagina: 0 });
  }

  filtrarPorCategoria(valor: string): void {
    this.navegar({ categoriaId: idDesdeUrl(valor), pagina: 0 });
  }

  irA(pagina: number): void {
    this.navegar({ pagina });
  }

  private navegar(cambios: Record<string, string | number | null>, replaceUrl = false): void {
    void this.router.navigate([], { queryParams: cambios, queryParamsHandling: 'merge', replaceUrl });
  }

  darDeBaja(producto: Producto): void {
    if (!window.confirm('¿Dar de baja el producto «' + producto.nombre + '»?')) return;
    this.productoService.darDeBaja(producto.id).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.errorCategorias.set(mensajeError(err)),
    });
  }
}
