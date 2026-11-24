# Proyecto_DesarrolloBasadoEnPlataformas

Sitio de Brasa Viva publicado en [GitHub Pages](https://juanfercaicedo.github.io/Proyecto_DesarrolloBasadoEnPlataformas/).

## Arquitectura

El repositorio separa las aplicaciones por responsabilidad:

- [`frontend/`](./frontend): sitio estático HTML, CSS y JavaScript; se publica en GitHub Pages.
- [`backend/`](./backend): API Node.js/Express y PostgreSQL/Prisma; se despliega como un servicio independiente en Render.
- [`frontend/admin.html`](./frontend/admin.html): panel privado para administrar pedidos, catálogo, ingredientes, lotes, proveedores, solicitudes de compra, recetas, usuarios y reportes.
- [`frontend/account.html`](./frontend/account.html): registro e inicio de sesión de clientes, direcciones frecuentes e historial de pedidos.

La arquitectura es **cliente-servidor**: el navegador consume la API HTTPS. El backend se mantiene como un **monolito modular** (una sola aplicación desplegable) con capas:

1. **Presentación/API:** rutas y controladores HTTP.
2. **Negocio:** servicios que validan pedidos y aplican reglas.
3. **Acceso a datos:** repositorios Prisma.
4. **Persistencia:** PostgreSQL administrado por Render.

El servidor verifica los productos y calcula los precios; guarda cada pedido y sus detalles y descuenta ingredientes de lotes por fecha de vencimiento dentro de la misma transacción. Si falta una receta o inventario suficiente, el pedido se rechaza sin guardar cambios parciales. Las credenciales de base de datos y de administración permanecen en Render; no se publican en GitHub Pages.

## Desplegar en Render

1. En Render, crea un **Blueprint** y conecta este repositorio. Render detectará [`render.yaml`](./render.yaml) y creará el servicio web `brasa-viva-api` junto con la base de datos PostgreSQL `brasa-viva-db`.
2. Confirma la creación y espera a que el despliegue termine. El primer arranque genera las tablas con Prisma y carga los datos iniciales.
3. Verifica la API en `https://brasa-viva-api.onrender.com/api/health`; debe responder `{"status":"ok"}`.

El Blueprint configura `DATABASE_URL`, permite el origen del frontend actual y genera valores para `ADMIN_API_KEY`, `ADMIN_PASSWORD` y `CUSTOMER_SESSION_SECRET`. Si Render asigna una URL pública distinta, configura la variable de repositorio `BRASA_API_URL` en **GitHub → Settings → Secrets and variables → Actions → Variables** con la URL completa terminada en `/api`. Luego vuelve a ejecutar el workflow de Pages.

Al publicar, abre `/admin.html` en el mismo sitio e inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados en Render (por defecto, el correo es `admin@brasaviva.local`). El usuario debe tener el rol `Administrador`. El panel usa una sesión firmada y temporal; `ADMIN_API_KEY` permanece en el servidor y no debe copiarse al navegador. No compartas ni publiques la contraseña administrativa.

> La configuración usa planes gratuitos para facilitar el primer despliegue. Render puede limitar o expirar sus bases gratuitas; revisa las condiciones vigentes y usa un plan con persistencia adecuada antes de aceptar pedidos reales. La base creada por este Blueprint es nueva: los datos de una instalación MySQL anterior no se migran automáticamente.
>
> El seed incluye recetas y cantidades iniciales **sintéticas para demostración**. Sustitúyelas por recetas y existencias reales antes de aceptar pedidos comerciales; el seed no repone lotes existentes.

## Publicar en GitHub Pages

El workflow [`pages.yml`](./.github/workflows/pages.yml) publica solo `frontend/`. Se ejecuta al actualizar `main` o manualmente desde **GitHub → Actions → Publicar en GitHub Pages → Run workflow**. La URL predeterminada de la API es `https://brasa-viva-api.onrender.com/api`; `BRASA_API_URL` solo es necesaria si Render asigna otra URL.

Si utilizas un dominio personalizado para Pages, agrega su origen (protocolo y dominio, sin ruta) a `FRONTEND_ORIGINS` en la configuración del servicio Render.

## Desarrollo local

Requiere Node.js 20 o posterior y una instancia PostgreSQL. Desde la raíz:

```powershell
npm ci
$env:DATABASE_URL = "postgresql://usuario:clave@localhost:5432/brasa_viva"
$env:ADMIN_PASSWORD = "una-clave-local-segura-de-al-menos-12"
$env:ADMIN_API_KEY = "una-clave-administrativa-local"
$env:CUSTOMER_SESSION_SECRET = "un-secreto-local-seguro-para-sesiones-de-clientes"
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

El total se calcula en el servidor en centavos. Para llamadas administrativas directas a la API, configura y envía `x-admin-key`; el panel obtiene una sesión Bearer individual al iniciar sesión. Mantén `ADMIN_API_KEY` en el servidor y no la copies al frontend.

`POST /api/admin/session` autentica cuentas con rol `Administrador` y devuelve una sesión Bearer firmada que vence en ocho horas; `/api/admin/session` permite comprobarla. El panel administrativo gestiona pedidos, productos, categorías, ingredientes, lotes con fechas de vencimiento, proveedores y solicitudes de compra, recetas, usuarios y reportes de ventas. Cuando un ingrediente llega al mínimo, el administrador puede registrar una solicitud pendiente al proveedor. El inventario solo aumenta al registrar su recepción, momento en que se crea un lote con fecha de vencimiento. Las listas CRUD administrativas, `/api/sales` y `/api/inventory/lots` aceptan `page` y `limit` (por defecto, página 1 con 50 registros; máximo 100) y responden con `pagination` junto con `data`. `/api/inventory/low-stock` devuelve el resumen completo por ingrediente. El cálculo de stock bajo excluye lotes vencidos.

Los clientes pueden comprar como invitados o crear una cuenta desde `/account.html`. `POST /api/customer/register` registra una cuenta, `POST /api/customer/session` inicia sesión y las rutas `/api/customer/addresses` y `/api/customer/orders` requieren su sesión Bearer. Las direcciones pueden agregarse, editarse y eliminarse. El historial muestra los 50 pedidos más recientes hechos con la cuenta; los pedidos de invitado no se asocian automáticamente para evitar exponerlos al registrar una cuenta con el mismo correo. Al pedir desde una sesión se pueden seleccionar direcciones guardadas o guardar una nueva para futuras compras.

## Informes de auditoría

Los diez informes, con hallazgos, correcciones y límites de validación, están en [`frontend/src/assets/documentation/auditorias/`](./frontend/src/assets/documentation/auditorias/):

1. [Privacidad de clientes](./frontend/src/assets/documentation/auditorias/auditoria-01-privacidad-clientes.md)
2. [Gestión de secretos](./frontend/src/assets/documentation/auditorias/auditoria-02-gestion-secretos.md)
3. [Validación de pedidos](./frontend/src/assets/documentation/auditorias/auditoria-03-validacion-pedidos.md)
4. [Accesibilidad](./frontend/src/assets/documentation/auditorias/auditoria-04-accesibilidad.md)
5. [Stock y vencimientos](./frontend/src/assets/documentation/auditorias/auditoria-05-stock-y-vencimientos.md)
6. [Integridad de datos](./frontend/src/assets/documentation/auditorias/auditoria-06-integridad-de-datos.md)
7. [Respuestas de la API](./frontend/src/assets/documentation/auditorias/auditoria-07-respuestas-api.md)
8. [Categorías del catálogo](./frontend/src/assets/documentation/auditorias/auditoria-08-categorias-catalogo.md)
9. [Paginación administrativa](./frontend/src/assets/documentation/auditorias/auditoria-09-paginacion-administrativa.md)
10. [Integración continua](./frontend/src/assets/documentation/auditorias/auditoria-10-integracion-continua.md)