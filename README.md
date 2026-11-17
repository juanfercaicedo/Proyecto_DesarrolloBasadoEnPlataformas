# Proyecto_DesarrolloBasadoEnPlataformas

- Sitio publicado en [GitHub Pages](https://juanfercaicedo.github.io/Proyecto_DesarrolloBasadoEnPlataformas/)

## Backend local

El proyecto utiliza Node.js, Express y Prisma ORM como un **monolito cliente-servidor**: el mismo proceso sirve la página, los recursos estáticos y la API. Prisma conecta con MySQL y define las 16 entidades del esquema de `ModeloBaseDatos.md` en `prisma/schema.prisma`. La organización es MVC con capas de persistencia y negocio:

- `models`: acceso al cliente Prisma y definición de recursos.
- `routes`: define las rutas HTTP.
- `controllers`: controladores por recurso (ingredientes, lotes, productos, pedidos, ventas, usuarios, pagos, facturas, etc.).
- `services`: aplica validaciones y reglas del negocio.
- `repositories`: encapsula consultas y operaciones ORM.
- `middlewares` y `errors`: centralizan el manejo de errores.

### Iniciar

Se requiere Node.js 20 o posterior y un servidor MySQL. El archivo `.env` local está preparado para MySQL en `localhost:3306` con el usuario `root` y contraseña vacía. Ajusta `DATABASE_URL` si tu instalación usa otras credenciales. Los valores `ADMIN_API_KEY` y `ADMIN_PASSWORD` incluidos son solo para desarrollo local: reemplázalos antes de exponer o desplegar el sistema.

```sql
CREATE DATABASE brasa_viva CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm start
```

`db:push` crea o actualiza las tablas según el esquema Prisma, y el seed carga roles, categorías, estados, métodos de pago, ingredientes y productos del catálogo JSON. Abre `http://localhost:3000`. Para desarrollo con reinicio automático usa `npm run dev`; las pruebas que no requieren una base externa se ejecutan con `npm test`.

### API

- `GET /api/health`: estado del servidor.
- `GET /api/products`: catálogo disponible, con precios consultados desde MySQL.
- `POST /api/orders`: registra el checkout de invitado y sus detalles en una transacción. Acepta `customer` (`name`, `phone`, `email`), `mode` (`Delivery`, `Para llevar` o `En restaurante`), `address` (obligatoria en Delivery) e `items` (`name`, `quantity`, `extra`). El extra aceptado es `0` o `150` centavos por queso adicional; el campo `order.total` de la respuesta está expresado en centavos.
- CRUD por recurso: `/api/ingredients`, `/api/ingredient-lots`, `/api/products/manage`, `/api/orders/manage`, `/api/order-details`, `/api/users`, `/api/roles`, `/api/categories`, `/api/recipes`, `/api/order-types`, `/api/order-statuses`, `/api/payments`, `/api/payment-methods`, `/api/invoices`, `/api/dispatch-orders` y `/api/dispatch-statuses`.
- `GET /api/inventory/low-stock` y `GET /api/inventory/lots`: existencias calculadas desde lotes y lotes ordenados por vencimiento.
- `GET /api/sales` y `GET /api/sales/summary?since=...&until=...`: ventas y resumen por fechas.

Las rutas de administración requieren el encabezado `x-admin-key` con el valor de `ADMIN_API_KEY`. El endpoint público de checkout crea o reutiliza el cliente por correo; el servidor calcula los importes desde los precios de MySQL y no confía en totales del cliente.

El stock disponible se calcula sumando `cantidad_disponible` de los lotes; no se almacena una columna redundante `stock_actual` en `INGREDIENTE`. `prisma db push` está pensado para desarrollo; antes de producción usa migraciones versionadas con `prisma migrate` y configura secretos propios. El `.env` está excluido de Git.