# S14 - Pasos 1 al 4

Rama local: `feature/integracion-estabilizacion-suarez`, creada desde `origin/develop` e integrada con el avance S13.

## Paso 1. Crear las ramas de trabajo

La rama está creada en los dos repositorios. Las ramas se publicaron el 13/11/2026: backend PR #4 y frontend PR #5 hacia develop.

## Paso 2. Cargar volumen de prueba y medir la línea base

La carga y las mediciones están en el backend: `docs/sql/volumen_pruebas.sql` y `docs/evidencias-s14/`. Oracle local quedó con 5015 productos y 20029 ventas. El tamaño 500 ahora devuelve HTTP 409.

## Paso 3. Paginar en la SPA: modelo, servicio y paginador

Se agregaron `core/models/pagina.ts` y `shared/components/paginador/`. Productos y Ventas comparten los controles de primera, anterior, siguiente, última y tamaño. Los servicios envían los parámetros al backend.

## Paso 4. La lista de productos con la página en la URL

Productos y Ventas leen los parámetros con `input()`, solicitan datos con `rxResource` y conservan la tabla anterior con `linkedSignal`. Cambiar filtros, tamaño u orden vuelve a la primera página. F5 y Atrás conservan el estado de la consulta.

Se comprobaron los botones, F5, historial, filtros de ventas, validación de fechas y resultado vacío. Las capturas y la tabla completa de tiempos/bytes están en `docs/s14-pasos-1-4.md` del backend.

Compilación de producción correcta. Se mantiene un aviso anterior de presupuesto CSS en `venta-form.css` (57 bytes).
