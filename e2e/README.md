# Pruebas S14

Requieren Oracle local, Redis y backend en `http://localhost:8080` con V4 aplicada.
Definir `E2E_ADMIN_PASSWORD`, `E2E_VENDEDOR_PASSWORD` y `E2E_ALMACEN_PASSWORD` en la sesión, sin guardarlas en Git.

```powershell
npx.cmd playwright install chromium
npm.cmd run e2e
npm.cmd run e2e:estable
npx.cmd playwright show-report
```

Son 7 pruebas independientes, un trabajador y cero reintentos. `e2e:estable` repite cada prueba tres veces.
La prueba de integración crea un cliente y un producto sintéticos nuevos por corrida, registra una venta de dos unidades y da de baja lógica ese producto al terminar. No borra datos anteriores.
El vencimiento de sesión adelanta el reloj de la SPA hasta el plazo informado por el backend; no espera una hora real ni cambia la configuración de seguridad.
