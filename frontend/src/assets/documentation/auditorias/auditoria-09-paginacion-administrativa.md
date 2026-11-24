# Auditoría 9 — Escalabilidad de listas administrativas

**Fecha:** 23 de noviembre de 2026  
**Alcance:** listas CRUD, ventas e inventario en `backend/src/`.

## Hallazgo

Las rutas de administración recuperaban todos los registros en cada solicitud. Con el crecimiento de pedidos, lotes o usuarios, esto eleva memoria, latencia y tamaño de respuesta sin límite.

## Resolución aplicada

Las listas CRUD, ventas y lotes de inventario aceptan paginación con página predeterminada 1, límite predeterminado 50 y máximo 100. Las respuestas conservan `data` y agregan `pagination` con total y número de páginas. Los parámetros no enteros, no positivos o fuera de rango devuelven 400.

## Verificación

Se agregó una prueba del cálculo de desplazamiento, metadatos de total y rechazo de un límite mayor que 100. La documentación de la API describe el contrato nuevo.
