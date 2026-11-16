import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { ConsultaPagina } from '../../../core/models/pagina';
import { Direccion, OrdenProducto, Producto, ProductoRequest } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  listar(consulta: ConsultaPagina): Observable<PaginaResponse<Producto>>;
  listar(pagina: number, tamanio: number, ordenarPor: OrdenProducto, direccion: Direccion): Observable<PaginaResponse<Producto>>;
  listar(paginaOConsulta: number | ConsultaPagina, tamanio = 20, ordenarPor: OrdenProducto = 'nombre', direccion: Direccion = 'asc'): Observable<PaginaResponse<Producto>> {
    const consulta = typeof paginaOConsulta === 'number'
      ? { pagina: paginaOConsulta, tamanio, ordenarPor, direccion }
      : paginaOConsulta;
    const params = new HttpParams()
      .set('pagina', consulta.pagina)
      .set('tamanio', consulta.tamanio)
      .set('ordenarPor', consulta.ordenarPor)
      .set('direccion', consulta.direccion);
    return this.http.get<PaginaResponse<Producto>>(this.url, { params });
  }

  buscarVendibles(texto: string): Observable<PaginaResponse<Producto>> {
    return this.http.get<PaginaResponse<Producto>>(`${this.url}/buscar`, { params: { texto } });
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  crear(dto: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.url, dto);
  }

  actualizar(id: number, dto: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/${id}`, dto);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
