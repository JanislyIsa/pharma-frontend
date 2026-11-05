# S13 - SPA con Nginx y Redis

## Arranque local

Ejecutar desde PowerShell, con Docker Desktop y el backend en el puerto 8080:

```powershell
cd C:\Users\jatni\Downloads\pharma-frontend
npm run build
docker stop pharma-redis
cd deploy
docker compose up -d
docker compose ps
docker compose exec web nginx -t
```

El comando stop detiene el contenedor de Redis usado en el paso 6 para liberar el puerto 6379. Compose crea su propio Redis; las claves de caché se regeneran al consultar los catálogos.

Abrir http://localhost:8081. Redis debe figurar healthy y web running. nginx -t debe confirmar que la configuración es válida. Se verificó docker compose config --quiet; el arranque y los encabezados HTTP quedan pendientes de comprobación en ejecución.

El backend se ejecuta en la máquina anfitriona. Nginx usa backend:host-gateway para reenviar /api/ a su puerto 8080. La build usa apiUrl relativa /api/v1.

Después de migrar al Redis de Compose, los comandos de inspección se ejecutan desde deploy:

```powershell
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli EXISTS "categorias::todas"
docker compose exec redis redis-cli TTL "categorias::todas"
```

## Política de entrega

- index.html: Cache-Control no-cache.
- JS/CSS con hash: public, max-age=31536000, immutable.
- Gzip habilitado para JS, CSS, JSON y SVG.
- try_files permite recargar rutas Angular como /productos.

La ejecución del backend en perfil prod corresponde al paso 10. La medición de primera visita y F5 se realizará en el paso 11 con Disable cache desmarcado.
