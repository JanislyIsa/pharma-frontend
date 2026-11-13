# S14 - Entrega y ejecución

Rama: `feature/integracion-estabilizacion-suarez`.

- Backend: V4 aplicada con Flyway, columnas de autoría, bitácora y consulta restringida a administración.
- Frontend: Productos y Ventas con paginación en URL; búsqueda remota en Nueva venta; Auditoría solo para admin.
- Verificación final: 23 pruebas Maven y 21 ejecuciones Playwright (7 pruebas repetidas tres veces), todas aprobadas.
- PDF: `output/pdf/Suarez_LP2_S14_Practica.pdf`.
- Evidencias completas e informe HTML: `docs/evidencias-s14/` en el backend.
- Incidencias y matriz: `docs/incidencias.md` y `docs/s14-matriz-integracion.md` en el backend.

Usar **npm** y el nuevo `package-lock.json` para reproducir las versiones verificadas:

```powershell
npm.cmd ci
npm.cmd start
```

Para E2E definir las tres variables de contraseña descritas en `e2e/README.md`, con el backend y Redis activos:

```powershell
npm.cmd run e2e:estable
```

La publicación y los PR hacia develop están preparados y pendientes de autorización explícita. No se fusionó ninguna rama.
