import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso-guard';

export const VENTAS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/venta-list/venta-list').then((m) => m.VentaList), title: 'Consulta de ventas' },
  { path: 'nueva', canActivate: [permisoGuard], data: { permiso: 'VENTAS_REGISTRAR' }, loadComponent: () => import('./pages/venta-form/venta-form').then((m) => m.VentaForm), title: 'Nueva venta' },
  { path: ':id', loadComponent: () => import('./pages/venta-detalle/venta-detalle').then((m) => m.VentaDetalle), title: 'Detalle de venta' },
];
