# Reproducción de S13 Autónoma - Parte A

Estos archivos sirven exclusivamente para medir. El script de instrumentación no se importa en src ni en la SPA normal.

## Compilar y preparar

Desde la raíz del frontend, con Node.js, dependencias instaladas, Docker Desktop y el backend en 8080:

```powershell
node node_modules/@angular/cli/bin/ng.js build --configuration production --stats-json
```

Copiar el directorio `dist/pharma-frontend/browser` completo a `tmp/s13-autonoma/no-preload/browser`. Conservar las estadísticas correspondientes antes de sobrescribir builds.

```powershell
node node_modules/@angular/cli/bin/ng.js build --configuration production,preloading --stats-json --output-path tmp/s13-autonoma/preload
node tools/benchmark/prepare-a.mjs
docker compose -f tools/benchmark/compose-a.yml up -d --wait
```

prepare-a.mjs requiere las mediciones guardadas A-antes-stats.json y A-despues-stats.json. Inyecta el script solo en las copias temporales y genera el resumen de builds.

## Medir

1. Abrir http://localhost:8083/?run=2 para la variante sin precarga y http://localhost:8084/?run=2 para la variante con precarga.
2. Iniciar sesión con el mismo vendedor en ambas, usando las credenciales locales sin incluirlas en capturas.
3. La página de prueba espera Inicio, deja pasar 2000 ms y pulsa el enlace de Ventas. El panel muestra los resultados de la medición. La tabla debe cargar correctamente desde el backend real.
4. Cerrar sesión, cambiar run a 3 y repetir; repetir también con run=4. El cierre de sesión usa el botón normal de la aplicación; no se altera la seguridad de las rutas.
5. Para auditar los resultados, el elemento DOM `#s13-benchmark-json` contiene el JSON completo de ese intento. Solo contiene URLs, tamaños, duraciones y condiciones de medición. Guardar tres resultados por estrategia y sus capturas.

El Nginx de prueba usa no-store en recursos para evitar una caché caliente del navegador. Se excluyen favicon y el script de medida. No hay limitación artificial de ancho de banda; los resultados describen un entorno local. Los dos servidores deben comprobarse en el mismo navegador, viewport y equipo.

## Cerrar los servidores temporales

```powershell
docker compose -f tools/benchmark/compose-a.yml down
```

Esto elimina solo el contenedor y red de medición; los servicios normales definidos en deploy/docker-compose.yml se gestionan por separado.
