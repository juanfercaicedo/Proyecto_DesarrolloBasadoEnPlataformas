# Proyecto_DesarrolloBasadoEnPlataformas

Sitio de Brasa Viva publicado en [GitHub Pages](https://juanfercaicedo.github.io/Proyecto_DesarrolloBasadoEnPlataformas/).

## Arquitectura

El repositorio separa las aplicaciones por responsabilidad:

- [`frontend/`](./frontend): sitio estático HTML, CSS y JavaScript; se publica en GitHub Pages.
- [`backend/`](./backend): API Node.js/Express y PostgreSQL/Prisma; se despliega como un servicio independiente en Render.

La arquitectura es **cliente-servidor**: el navegador consume la API HTTPS. El backend se mantiene como un **monolito modular** (una sola aplicación desplegable) con capas:

1. **Presentación/API:** rutas y controladores HTTP.
2. **Negocio:** servicios que validan pedidos y aplican reglas.
3. **Acceso a datos:** repositorios Prisma.
4. **Persistencia:** PostgreSQL administrado por Render.

El servidor verifica los productos y calcula los precios, y guarda cada pedido y sus detalles en una transacción. Las credenciales de base de datos y de administración permanecen en Render; no se publican en GitHub Pages.

## Desplegar en Render

1. En Render, crea un **Blueprint** y conecta este repositorio. Render detectará [`render.yaml`](./render.yaml) y creará el servicio web `brasa-viva-api` junto con la base de datos PostgreSQL `brasa-viva-db`.
2. Confirma la creación y espera a que el despliegue termine. El primer arranque genera las tablas con Prisma y carga los datos iniciales.
3. Verifica la API en `https://brasa-viva-api.onrender.com/api/health`; debe responder `{"status":"ok"}`.

El Blueprint configura `DATABASE_URL`, permite el origen del frontend actual y genera valores para `ADMIN_API_KEY` y `ADMIN_PASSWORD`. Si Render asigna una URL pública distinta, configura la variable de repositorio `BRASA_API_URL` en **GitHub → Settings → Secrets and variables → Actions → Variables** con la URL completa terminada en `/api`. Luego vuelve a ejecutar el workflow de Pages.

> La configuración usa planes gratuitos para facilitar el primer despliegue. Render puede limitar o expirar sus bases gratuitas; revisa las condiciones vigentes y usa un plan con persistencia adecuada antes de aceptar pedidos reales. La base creada por este Blueprint es nueva: los datos de una instalación MySQL anterior no se migran automáticamente.

## Publicar en GitHub Pages

El workflow [`pages.yml`](./.github/workflows/pages.yml) publica solo `frontend/`. Se ejecuta al actualizar `main` o manualmente desde **GitHub → Actions → Publicar en GitHub Pages → Run workflow**. La URL predeterminada de la API es `https://brasa-viva-api.onrender.com/api`; `BRASA_API_URL` solo es necesaria si Render asigna otra URL.

Si utilizas un dominio personalizado para Pages, agrega su origen (protocolo y dominio, sin ruta) a `FRONTEND_ORIGINS` en la configuración del servicio Render.

## Desarrollo local

Requiere Node.js 20 o posterior y una instancia PostgreSQL. Desde la raíz:

```powershell
npm ci
$env:DATABASE_URL = "postgresql://usuario:clave@localhost:5432/brasa_viva"
npm run db:generate
npm run db:push
npm run db:seed
npm start
```

Sirve [`frontend/`](./frontend) con una extensión como Live Server en `http://localhost:5500`. El backend acepta ese origen local. Para reiniciar automáticamente el backend, usa `npm run dev`; las pruebas automatizadas se ejecutan con `npm test`.

## API principal

- `GET /api/health`: estado del servicio.
- `GET /api/products`: catálogo disponible.
- `POST /api/orders`: registra un pedido; acepta `customer` (`name`, `phone`, `email`), `mode` (`Delivery`, `Para llevar` o `En restaurante`), `address` (obligatoria para Delivery) e `items` (`name`, `quantity`, `extra`).

El total se calcula en el servidor en centavos. Las rutas administrativas requieren el encabezado `x-admin-key`; configura secretos propios en Render antes de habilitar su uso.
