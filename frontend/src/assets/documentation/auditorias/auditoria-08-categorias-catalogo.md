# Auditoría 8 — Correspondencia entre catálogo y categorías

**Fecha:** 23 de noviembre de 2026  
**Alcance:** respuesta de `/api/products` y renderizado de tarjetas.

## Hallazgo

El backend ya devolvía la categoría de base de datos, pero el frontend asignaba `"hamburguesas"` a todas las tarjetas. Por ello, cualquier producto válido de otra categoría aparecía en el filtro incorrecto o no aparecía al seleccionar su categoría.

## Resolución aplicada

Las tarjetas derivan su categoría del dato recibido de la API, normalizado para eliminar acentos y separadores. El validador del catálogo exige que la categoría exista y no esté vacía.

## Verificación

La categoría actual “Hamburguesas” continúa asociándose al filtro existente; valores como “Acompañamientos” y “Bebidas” se normalizan a los identificadores de los filtros correspondientes.
