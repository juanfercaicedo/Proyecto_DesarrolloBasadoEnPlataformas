# Auditoría 7 — Manejo de respuestas de la API

**Fecha:** 23 de noviembre de 2026  
**Alcance:** peticiones del frontend en `frontend/src/assets/js/script.js`.

## Hallazgo

El checkout y la carga del catálogo llamaban directamente a `response.json()`. Si el servidor devolvía HTML, una respuesta vacía o JSON malformado (por ejemplo, un error del proxy), el usuario recibía un error de parseo sin explicar que la respuesta del servicio era inválida.

## Resolución aplicada

Ambos flujos usan ahora `readApiResponse`, que conserva el error explícito cuando el cuerpo no se puede interpretar como JSON y lo presenta en la región de estado del checkout o en el estado de carga del menú.

## Verificación

Se confirmó que las dos peticiones pasan por el mismo lector y que los errores siguen mostrándose, no se silencian ni se convierten en éxito. No se realizó una prueba de red simulada en navegador.
