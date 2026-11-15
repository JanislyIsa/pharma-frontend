# Actividad autónoma S14

Se conserva la rama `feature/integracion-estabilizacion-suarez`. La auditoría ahora muestra el ID por separado y los eventos CLIENTE_REGISTRADO y VENTA_ANULADA. El filtro Acción tiene nombre accesible explícito.

Suite: 14 casos, tres repeticiones; 42/42 aprobadas el 15/11/2026, sin retries ni waitForTimeout. Versión FE `5809bc4`, backend `953f7cf`.

Preparación local:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run build
# Definir E2E_ADMIN_PASSWORD, E2E_VENDEDOR_PASSWORD y E2E_ALMACEN_PASSWORD
# con las claves de las cuentas educativas del entorno local, sin guardarlas en Git.
npx.cmd playwright test --repeat-each=3
npx.cmd playwright show-report
```

Oracle, Redis y backend :8080 deben estar listos; Playwright inicia la SPA :4200. Los tests generan datos propios en esa base local de demostración. El script `tools/s14-grabar-demo.cjs` requiere además Nginx :8081 y la carpeta de evidencia del backend; graba un video técnico automatizado de seis bloques, separado de la suite. Sus pausas son para lectura del video, no esperas de los E2E.

[Índice completo y evidencias en backend](https://github.com/JanislyIsa/pharmaSoft/blob/feature/integracion-estabilizacion-suarez/docs/README.md).

El estudiante debe completar sus dos ensayos orales y revisar las respuestas de defensa con sus palabras antes de entregar.
