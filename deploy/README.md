# Nginx y Redis para S13

Consulta [Despliegue en producción](../README.md#despliegue-en-producción) para los pasos de construcción, actualización y reversión. En laboratorio, con Docker y el backend en el host en 8080:

```powershell
npm.cmd run build
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml exec web nginx -t
docker compose -f deploy/docker-compose.yml exec redis redis-cli ping
```

Nginx sirve la aplicación en 8081 y reenvía `/api/` al backend. Si 6379 está ocupado, identifica el servicio que lo usa antes de iniciarlo. Redis es accesible solo desde el host en esta configuración local.

La actividad autónoma verificó cinco cabeceras con `curl -I`, revalidación de `index.html` con 304 condicional, reutilización de archivos con hash y actualización de Productos sin reiniciar Nginx. Las capturas y registros se conservan en [evidencias S13, parte B](../docs/evidencias-s13-autonoma/B).
