# Auditoría 5 — Exactitud del inventario

**Fecha:** 23 de noviembre de 2026  
**Alcance:** cálculo de stock bajo en `backend/src/controllers/inventoryController.js`.

## Hallazgo

El stock actual sumaba todos los lotes disponibles sin considerar su fecha de vencimiento. Un lote vencido podía ocultar una alerta de bajo inventario aunque ya no fuera utilizable.

## Resolución aplicada

- La consulta de stock bajo filtra lotes vencidos y cantidades no positivas antes de sumar. La fecha se normaliza al inicio del día UTC para que los lotes que vencen hoy sigan disponibles ese día.
- El seed agrega recetas y lotes de demostración para el menú. Al confirmar una compra, el servidor valida recetas, agrega requerimientos por ingrediente y consume lotes vigentes por fecha de vencimiento, dentro de la transacción del pedido.
- El catálogo público omite productos sin receta o sin cantidad suficiente para preparar al menos una unidad; el checkout vuelve a validar el stock como autoridad final.
- La cantidad se maneja en milésimas; la actualización del lote es condicional para evitar saldo negativo ante pedidos simultáneos. Si el stock no alcanza, la transacción completa se revierte y se informa el ingrediente faltante.
- El queso extra consume además 30 g del queso definido en la receta del producto.

## Verificación

Se añadieron pruebas unitarias para excluir vencidos, consumir primero el lote más próximo a vencer y rechazar un pedido sin stock suficiente. Se autorizó usar cantidades convenientes de demostración; no son recetas ni existencias reales. La suite no se pudo ejecutar localmente porque Node.js/npm no están disponibles.
