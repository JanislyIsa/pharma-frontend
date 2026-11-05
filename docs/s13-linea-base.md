# S13 - Paso 2: línea base antes de optimizar

Fecha: 5 de noviembre de 2026.
Rama: feature/optimizacion-produccion-suarez.
Medición sobre el avance actual, incluidos los cambios pendientes de sesiones anteriores.

| Indicador | Antes | Después |
| --- | --- | --- |
| Initial total - Raw size | 364.09 kB | Pendiente |
| Initial total - Estimated transfer size | 98.05 kB | Pendiente |
| Lazy chunk files | 19 (15 filas visibles y 4 adicionales) | Pendiente |
| Consultas SQL en dos GET de categorías | 2 SELECT de categorías (uno por llamada), según capturas compartidas | Pendiente |
| Tiempo del segundo GET de categorías | 38.04 ms de duración total en Network; espera de respuesta: 36.35 ms | Pendiente |
| Aciertos Redis de categorías | No medido | Pendiente |
| Bytes al recargar /productos en Nginx | Se mide en el paso 11 | Pendiente |

Comando ejecutado: `node node_modules/@angular/cli/bin/ng.js build`.
Salida guardada en `s13-linea-base-build.txt`, en la raíz del frontend.
La compilación generó la aplicación y no mostró errores de budgets.
Estas cifras se registraron antes de aplicar optimizaciones S13.

## Paso 3: revisión de carga diferida

Se comprobó que inicio, categorías, clientes, productos, ventas y reportes se cargan con importaciones dinámicas desde las rutas. Se cambió el login de importación estática a loadComponent y se retiró una importación estática sin uso de NoEncontrado.

La compilación posterior completó sin errores: Initial total de 308.26 kB (86.54 kB de transferencia estimada) y 22 chunks diferidos (15 visibles y 7 adicionales). Login aparece como chunk diferido. Son valores intermedios del paso 3, no la medición final de producción. La salida está en s13-paso3-build.txt.

## Completar medición del backend

Las capturas compartidas muestran dos GET de categorías con HTTP 200 y dos consultas SELECT de categorías. Las consultas de usuarios, roles y empleados corresponden a la autenticación y no se cuentan en este indicador. La captura posterior de Timing muestra la segunda solicitud seleccionada: duración total 38.04 ms y espera de respuesta del servidor 36.35 ms. En esa captura aparece también una tercera solicitud, que no se incluye en el conteo original de dos llamadas.

1. Iniciar Oracle y el backend con el perfil de desarrollo.
2. Abrir Swagger en http://localhost:8080/swagger-ui.html e iniciar sesión mediante POST /api/v1/auth/login.
3. Autorizar Swagger con el token sin incluirlo en capturas.
4. Ejecutar GET /api/v1/categorias dos veces consecutivas.
5. Registrar el número real de SELECT de categorías en la consola y el tiempo del segundo GET en DevTools, pestaña Network.
6. Guardar capturas de las solicitudes y de los SELECT para completar la tabla.

El método actual de listado no registra «Fin listar categorias» ni duracionMs; el tiempo puede obtenerse de Network, como permite la guía.

## Paso 4: reporte del inicio con @defer

Se agregó MasVendidos, usado exclusivamente dentro de @defer (on viewport), protegido por el permiso REPORTES_VER. Incluye placeholder, carga y error de descarga; el componente también distingue carga de datos, fallo de consulta y lista vacía. Usa los campos que devuelve el endpoint existente: producto, cantidad y monto.

Compilación correcta: mas-vendidos figura en Lazy chunk files con 1.90 kB. Initial total intermedio: 318.15 kB raw / 89.62 kB de transferencia estimada. Se generan 23 chunks diferidos (15 filas visibles y 8 adicionales). Salida guardada en s13-paso4-build.txt.

Capturas recibidas: vendedor en Inicio sin reporte y sin consulta al endpoint visible en Fetch/XHR; admin con tabla y consulta productos-mas-vendidos HTTP 200. Pendiente: capturar placeholder/carga y usar All o JS para comprobar la descarga del chunk, que Fetch/XHR oculta.

## Paso 5: entornos y presupuestos

Producción usa production: true y apiUrl: /api/v1; desarrollo usa production: false y http://localhost:8080/api/v1. Se conserva fileReplacements de development y outputHashing: all. El interceptor de autenticación ahora resuelve el API relativo contra el origen del navegador.

Budget inicial: aviso 440 kB (aproximadamente línea base + 20 %) y error 1 MB. Estilos: aviso 4 kB y error 8 kB, según la guía.

ng build --stats-json completó: Initial total 318.19 kB / 89.63 kB de transferencia estimada. Hay un aviso de estilo del formulario de ventas: 4.06 kB, 57 bytes por encima del aviso; no supera el límite de error de 8 kB. Salida: s13-paso5-build.txt. Estadísticas: dist/pharma-frontend/browser-stats.json.

Los tres archivos de entrada con mayor contribución al tamaño de salida, sumando bytesInOutput de las estadísticas, son Angular Core (_debug_node-chunk.mjs): 139534 bytes, Angular Router (_router-chunk.mjs): 86572 bytes y Angular Forms (forms.mjs): 63367 bytes. Esta medición es de tamaño generado, no transferencia comprimida.
