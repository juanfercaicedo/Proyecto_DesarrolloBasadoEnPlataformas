# Auditoría 4 — Accesibilidad del diálogo de pedido

**Fecha:** 23 de noviembre de 2026  
**Alcance:** diálogo de carrito y contraste de componentes en `frontend/`.

## Hallazgo

El ciclo de foco del diálogo incluía cualquier input no deshabilitado. Al elegir una modalidad distinta de Delivery, el campo de dirección queda dentro de un contenedor `hidden`, pero seguía en la lista de foco y el teclado podía terminar en un control invisible. Además, el contador del carrito usaba `--red-foreground`, variable que no estaba definida.

## Resolución aplicada

- El ciclo de foco descarta elementos con un ancestro `[hidden]`.
- Se definió `--red-foreground` para los temas claro y oscuro, de forma que el texto del contador contraste con su fondo.

## Verificación

Se revisó el selector del foco y ambas definiciones de tema. Se requiere comprobación manual con teclado/lector de pantalla en navegador tras el despliegue; no se afirma una prueba de lector de pantalla.
