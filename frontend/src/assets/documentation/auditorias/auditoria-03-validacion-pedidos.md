# Auditoría 3 — Validación y límites del checkout

**Fecha:** 23 de noviembre de 2026  
**Alcance:** formulario de compra y `backend/src/services/orderService.js`.

## Hallazgo

El servidor limita cada línea a 99 unidades, pero la interfaz permitía seguir incrementándola y después el backend rechazaba todo el pedido. También había una discrepancia entre el máximo de nombre del formulario (80) y el aceptado por el servidor (100); la dirección no tenía un máximo equivalente en el servidor aunque la base de datos limita el campo a 255.

## Resolución aplicada

- El carrito ahora limita a 99 unidades, anuncia el tope y rechaza/restaura de forma segura cantidades almacenadas fuera del rango.
- El nombre del formulario acepta los mismos 100 caracteres que el backend.
- La dirección Delivery se valida en servidor entre 5 y 255 caracteres, coincidiendo con el tamaño de persistencia.

## Verificación

Se agregó una prueba HTTP para el rechazo de 100 unidades y se conserva la prueba de dirección obligatoria. No se pudo ejecutar la suite local por falta de Node.js.
