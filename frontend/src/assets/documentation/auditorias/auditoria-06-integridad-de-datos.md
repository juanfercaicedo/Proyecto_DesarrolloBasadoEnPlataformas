# Auditoría 6 — Integridad de datos en operaciones administrativas

**Fecha:** 23 de noviembre de 2026  
**Alcance:** servicio CRUD genérico de `backend/src/services/resourceService.js`.

## Hallazgo

El CRUD administrativo filtraba nombres de campos, pero aceptaba números negativos en precios, pagos y cantidades de inventario, así como identificadores y cantidades sin rango válido. Esos valores podían persistirse y volver incorrectos los totales o alertas.

## Resolución aplicada

Antes de enviar datos a Prisma, el servicio valida identificadores como enteros positivos, permite `null` solo en relaciones opcionales conocidas, exige cantidad entera positiva, requiere valores positivos para cantidades iniciales y de receta, y prohíbe importes/medidas decimales negativos o no finitos.

## Verificación

Se agregó una prueba HTTP que confirma que `stock_minimo` negativo devuelve 400 antes de acceder a la base de datos. Se revisó que los campos decimales opcionales no se conviertan en valores implícitos.
