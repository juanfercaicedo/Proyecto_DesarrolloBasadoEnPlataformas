# Auditoría 5 — Exactitud y consumo de inventario

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Alta
- **Estado:** Correcciones aplicadas; recetas y existencias del seed son solo demostrativas
**Alcance:** `backend/src/controllers/inventoryController.js`, `backend/src/repositories/productRepository.js`, `backend/src/services/productService.js`, `backend/src/services/orderService.js` y `backend/src/database/seed.js`.

## Resumen ejecutivo

La funcionalidad de inventario calculaba alertas sumando lotes vencidos y el checkout creaba pedidos sin descontar ingredientes, pese a que `Deber.md` especifica consumo automático. Se implementó validación y descuento por receta dentro de la transacción del pedido, se excluyó inventario vencido del stock utilizable y se configuraron cantidades de demostración autorizadas para que el flujo inicial pueda probarse.

## Método y evidencia

Se trazó el flujo completo desde `GET /api/products` hasta el catálogo y desde `POST /api/orders` hasta `createOrderTransaction`. Antes de la corrección:

- `inventoryController.lowStock` sumaba todas las cantidades de los lotes sin filtrar vencimiento.
- `orderService` verificaba disponibilidad/precio del producto y escribía pedido y detalles, pero no consultaba `Receta` ni actualizaba `LoteIngrediente`.
- El seed creaba ingredientes, pero no recetas ni lotes iniciales; por tanto, un descuento estricto requería datos de dominio que aún no existían.

## Hallazgos e impacto

1. **Stock inflado por lotes vencidos:** una alerta podía no activarse aun cuando el stock utilizable estuviera bajo.
2. **Venta sin consumo:** los pedidos no reducían el inventario; el saldo podía seguir mostrando unidades que ya se habían vendido.
3. **Ausencia de receta o stock:** no había una condición transaccional que rechazara la operación si no se podía producir el pedido.
4. **Sin datos iniciales reproducibles:** el seed no permitía comprobar el flujo de extremo a extremo desde una instalación limpia.

## Resolución aplicada

- El cálculo de stock bajo normaliza el día actual a UTC y solo suma lotes no vencidos con cantidad positiva. Un lote que vence hoy permanece utilizable durante ese día.
- El repositorio de productos carga recetas y lotes vigentes; el servicio público omite productos sin receta o sin existencias para al menos una unidad. El checkout revalida el stock y no confía en la lista pública.
- `orderService` obtiene productos y recetas, multiplica los requerimientos por las cantidades del pedido, agrupa la demanda por ingrediente y consume lotes por fecha de vencimiento ascendente (FEFO), con `id_lote` como desempate.
- Los decimales se convierten a milésimas antes de calcular. Cada actualización usa una condición `cantidad_disponible >= cantidad_a_descontar` y decremento atómico. Si falta stock, lanza 409; al ocurrir dentro de `$transaction`, también se revierten los decrementos parciales y el alta del cliente/pedido.
- El queso extra añade 30 g del queso asociado a la receta del producto.
- El seed crea lotes y recetas sintéticos idempotentes. `update: {}` evita reponer cantidades cada vez que se ejecuta; los datos deben reemplazarse por inventario y recetas reales antes de operar comercialmente.

## Verificación

Se añadieron pruebas unitarias de exclusión de lotes vencidos, orden FEFO, consumo fraccionario en milésimas y rechazo por stock insuficiente, además de verificar el mensaje 409. Son pruebas con dobles de repositorio, no una prueba concurrente contra PostgreSQL. No se ejecutaron porque Node.js/npm no están disponibles en esta máquina.

## Riesgo residual

Los gramos, unidades, recetas, stock inicial y vencimientos del seed son ejemplos sintéticos autorizados, no valores validados por cocina. Antes de ventas reales deben reemplazarse por datos correctos. Para mayor garantía, falta una prueba de integración con PostgreSQL que cubra rollback y dos pedidos concurrentes sobre el mismo lote.
