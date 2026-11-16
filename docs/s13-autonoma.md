# Evidencias de la actividad autónoma S13

Mediciones del 8 de noviembre de 2026 en la rama `feature/optimizacion-produccion-suarez`. Backend con perfil prod, Nginx 8081, Oracle y Redis locales. El [informe de la parte A](s13-autonoma-parte-a.md) explica la diferencia entre un módulo de entrada y un chunk generado.

| Parte | Registros reproducibles |
|---|---|
| A. Tamaño y precarga | `A/A-antes-stats.json`, `A/A-despues-stats.json`, captura del analizador, tres pares de ejecuciones y mediana. |
| B. Caché HTTP | `B/B-curl-head.json`, manifiestos con hash y hora de inicio de Nginx, Resource Timing de recarga normal, capturas del cambio de texto. |
| C. Redis | `C/C-aciertos-20x2.json`, TTL temporal y restaurado, matriz, respuesta y captura de Productos con Redis apagado. |
| D. Observabilidad | POST 201 de la SPA, cuatro líneas de log por ID, error 404 visible, estado de salud con y sin token, métricas y auditoría resumida. |

Los archivos están en [evidencias-s13-autonoma](evidencias-s13-autonoma). Se guardan los encabezados y campos de respuesta necesarios para validar la prueba. No se conservan las cabeceras de autorización, los cuerpos de login ni los datos de identidad de clientes en los registros técnicos.

## Repetición

1. Ejecuta una compilación de producción con `--stats-json`. Usa [tools/benchmark/README.md](../tools/benchmark/README.md) para las dos variantes de precarga. La comparación registró el tráfico hasta el clic en Ventas y el tiempo hasta la primera fila visible.
2. Para verificar B, toma un manifiesto con `python tools/s13_autonoma.py deploy antes` desde el backend. Opcionalmente, instala el panel local con `node tools/instrument-evidence.mjs` desde frontend. Visita Productos y Ventas, recarga normalmente y toma la muestra. Conserva la sesión. Cambia el texto de Productos, recompila y vuelve a tomar la muestra; no detengas Nginx. Ejecuta `deploy despues`, retira el panel con `node tools/instrument-evidence.mjs --remove` y ejecuta `head` desde backend. El panel lee Resource Timing; 0 bytes transferidos con cuerpo disponible significa caché local y no identifica si fue memoria o disco.
3. Con el backend recién iniciado, ejecuta `python tools/s13_autonoma.py caches`: elimina solo dos claves de catálogo y ejecuta 20 GET por caché; calcula deltas de `cache.gets`. Para TTL usa una instancia de laboratorio en 8082 con `--spring.cache.redis.time-to-live=1m --spring.data.redis.database=1` y ejecuta `ttl`. Detén esa instancia al terminar.
4. Ejecuta `matrix` solo en el entorno de pruebas. Crea sus propios registros. Registra una sola venta desde la SPA con el producto de `C/C-fixture.json`, y ejecuta `after-sale <id>`. Para C-06 ejecuta `down`, abre Productos y registra el resultado. Ejecuta `up` inmediatamente después, incluso si falla la comprobación.
5. Con el panel temporal, guarda la respuesta POST y su `X-Request-Id` en `D/D-venta-post.json` y ejecuta `sale-trace`. Abre la edición de un producto inexistente y comprueba que la alerta coincide con el código en la cabecera y en el JSON. Ejecuta `audit` para repetir la auditoría y las métricas; la búsqueda se hace sobre la muestra local del log de producción.

Los comandos `caches`, `ttl`, `matrix`, `down`, `up`, `head`, `audit`, `deploy` y `sale-trace` pertenecen a `pharmaSoft-main/tools/s13_autonoma.py`. Ejecuta cada uno como `python tools/s13_autonoma.py <comando>`. Usa las variables de prueba indicadas en el README o introduce la contraseña cuando el script la solicite.
