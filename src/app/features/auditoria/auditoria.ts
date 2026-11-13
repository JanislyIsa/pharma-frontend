import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Pagina } from '../../core/models/pagina';
import { paginaDesdeUrl, tamanioDesdeUrl } from '../../core/utils/paginacion-url';
import { mensajeError } from '../../core/utils/http-error';
import { Paginador } from '../../shared/components/paginador/paginador';
interface Evento { id:number; fecha:string; usuario:string; accion:string; entidad:string; entidadId:number|null; detalle:string|null; requestId:string|null; }
@Component({
 selector:'app-auditoria',imports:[DatePipe,Paginador],
 template:`<h1>Auditoría</h1><p>Consulta los accesos y cambios registrados en el sistema.</p>
 <form (submit)="$event.preventDefault(); filtrar(u.value,a.value,d.value,h.value)">
 <label>Usuario <input #u [value]="usuario() ?? ''"></label>
 <label>Acción <select #a [value]="accion() ?? ''"><option value="">Todas</option>
 <option>LOGIN_EXITOSO</option><option>LOGIN_FALLIDO</option><option>VENTA_REGISTRADA</option><option>PRECIO_MODIFICADO</option><option>PRODUCTO_ELIMINADO</option></select></label>
 <label>Desde <input #d type="date" [value]="desde() ?? ''"></label><label>Hasta <input #h type="date" [value]="hasta() ?? ''"></label>
 <button type="submit">Buscar</button></form>
 @if (consulta.error()) { <p role="alert">{{ error() }}</p> }
 @if (consulta.isLoading()) { <p role="status">Cargando eventos…</p> }
 @if (resultado(); as p) {
 <div class="tabla"><table data-testid="tabla-auditoria"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th><th>Solicitud</th></tr></thead><tbody>
 @for(e of p.contenido; track e.id) {<tr><td>{{e.fecha | date:'dd/MM/yyyy HH:mm:ss'}}</td><td>{{e.usuario}}</td><td>{{e.accion}}</td><td>{{e.entidad}} {{e.entidadId}}</td><td>{{e.detalle}}</td><td>{{e.requestId}}</td></tr>}
 @empty {<tr><td colspan="6">No hay eventos con esos filtros.</td></tr>}
 </tbody></table></div>
 <app-paginador [pagina]="p.pagina" [totalPaginas]="p.totalPaginas" [totalElementos]="p.totalElementos" [tamanio]="p.tamanio" [deshabilitado]="consulta.isLoading()" (cambioPagina)="navegar({pagina:$event})" (cambioTamanio)="navegar({tamanio:$event,pagina:0})" />}
 `,
 styles:`:host{display:block;padding:24px;color:#12315d}form{display:flex;flex-wrap:wrap;gap:12px;padding:16px;background:white;border-radius:14px;margin:20px 0}label{display:grid;gap:6px;font-size:13px}input,select,button{padding:9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}button{background:#12315d;color:white;align-self:end;cursor:pointer}.tabla{overflow:auto}table{width:100%;border-collapse:collapse;background:white;font-size:13px}th{text-align:left;background:#12315d;color:white}th,td{padding:12px;border-bottom:1px solid #e0e6ef}td{overflow-wrap:anywhere}h1{font-size:32px}`
})
export class Auditoria {
 private readonly http=inject(HttpClient); private readonly router=inject(Router);
 readonly pagina=input(0,{transform:paginaDesdeUrl});readonly tamanio=input(20,{transform:tamanioDesdeUrl});
 readonly usuario=input<string>();readonly accion=input<string>();readonly desde=input<string>();readonly hasta=input<string>();
 protected readonly consulta=rxResource({params:()=>({pagina:this.pagina(),tamanio:this.tamanio(),usuario:this.usuario(),accion:this.accion(),desde:this.desde(),hasta:this.hasta()}),
 stream:({params})=>{let p=new HttpParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!=='')p=p.set(k,String(v));});return this.http.get<Pagina<Evento>>(environment.apiUrl+'/auditoria',{params:p});}});
 protected readonly resultado=linkedSignal<Pagina<Evento>|undefined,Pagina<Evento>|undefined>({source:()=>this.consulta.hasValue()?this.consulta.value():undefined,computation:(n,p)=>n??p?.value});
 protected error(){const e=this.consulta.error();return e instanceof HttpErrorResponse?mensajeError(e):'No se pudo consultar la auditoría.';}
 protected navegar(c:Record<string,string|number|null>){void this.router.navigate([],{queryParams:c,queryParamsHandling:'merge'});}
 protected filtrar(usuario:string,accion:string,desde:string,hasta:string){this.navegar({usuario:usuario||null,accion:accion||null,desde:desde||null,hasta:hasta||null,pagina:0});}
}
