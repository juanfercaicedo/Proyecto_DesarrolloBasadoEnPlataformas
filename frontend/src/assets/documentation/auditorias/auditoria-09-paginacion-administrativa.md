# Auditoría 9 — Escalabilidad y contrato de listas administrativas

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Paginación aplicada en CRUD, ventas y lotes de inventario
**Alcance:** `resourceService`, `resourceRepository`, `resourceControllerFactory`, `salesController` e `inventoryController`.

## Resumen ejecutivo

Las listas administrativas recuperaban colecciones completas sin límite ni orden estable en los recursos CRUD, ventas y lotes. Se añadió paginación con valores predeterminados acotados, validación de parámetros y metadatos. La respuesta mantiene `data` como arreglo para minimizar el impacto en consumidores existentes.

## Método y evidencia

Se inspeccionaron las llamadas `findMany` de las rutas administrativas. El repositorio de recursos usaba `delegate.findMany()` sin `skip` ni `take`; `/sales` y `/inventory/lots` también solicitaban todos los registros. El costo de cada petición y el tamaño de respuesta crecían con el historial acumulado.

## Hallazgo e impacto

- Alto consumo de memoria/tiempo para tablas de pedidos, lotes y usuarios en crecimiento.
- Respuestas potencialmente grandes y lentas para clientes administrativos.
- Sin orden explícito en recursos genéricos, lo que podía hacer inestable la navegación entre páginas si se agregaban registros.
- Valores de página arbitrarios, si se incorporaban sin validación, podían generar offsets no válidos o demasiado grandes.

## Resolución aplicada

- `parsePagination` fija página predeterminada 1 y límite predeterminado 50; exige enteros positivos, restringe el límite a 100 y valida que el offset sea seguro.
- El repositorio genérico aplica `skip`, `take` y orden ascendente por identificador, y calcula el total.
- Las respuestas CRUD agregan `pagination: { page, limit, total, totalPages }` sin cambiar el arreglo `data`.
- `/sales` aplica la misma política, valida el filtro `status`, ordena por fecha descendente y cuenta bajo el mismo filtro.
- `/inventory/lots` pagina los lotes y conserva `expiringBefore`.
- `README.md` documenta el contrato.

## Verificación

Una prueba con delegate simulado comprueba página 3, límite 25, offset 50, total de 205 y nueve páginas; también verifica el rechazo de límite 101. Se revisó que el controlador conserve `data` en la respuesta. No fue posible ejecutar la suite local por ausencia de Node.js/npm.

## Riesgo residual

`/inventory/low-stock` no se pagina: devuelve ingredientes con lotes vigentes, normalmente una colección mucho menor que los movimientos de lotes. El conteo y la página se ejecutan como consultas separadas, por lo que altas concurrentes pueden hacer que `total` cambie entre ambas. Para volúmenes muy grandes, se recomienda paginación por cursor y pruebas del contrato con el cliente que consuma las rutas.
