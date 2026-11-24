# Auditoría 7 — Manejo de errores y respuestas del backend

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Leve
- **Estado:** Corrección aplicada; pruebas de respuestas anómalas en navegador pendientes
**Alcance:** solicitudes `fetch` de `frontend/src/assets/js/script.js`, carga del catálogo y confirmación de pedidos.

## Resumen ejecutivo

El frontend asumía que todos los servidores intermedios y la API devolverían JSON válido. Si el proxy, hosting o servidor respondía con HTML, cuerpo vacío o JSON inválido, `response.json()` rechazaba con un error técnico de parseo. Se unificó el parseo y se valida además que el valor JSON sea un objeto utilizable.

## Método y evidencia

Se rastrearon las dos solicitudes de red del script:

1. `GET /products`, cuyo resultado se espera con `products`.
2. `POST /orders`, cuyo resultado correcto contiene `order`, y cuyo error se espera en `error`.

Ambas rutas manejaban el estado HTTP, pero ejecutaban `response.json()` directamente. Un status de error no garantiza que el cuerpo venga en JSON: algunos proxies y páginas de error del hosting devuelven HTML.

## Hallazgo e impacto

Ante una respuesta no JSON, el rechazo del parser reemplazaba el mensaje esperado del servidor por el error interno de sintaxis. En carga del catálogo se mostraba una condición de error sin indicar claramente que el formato de respuesta era inválido; en checkout, el mensaje podía ser difícil de entender para el usuario.

## Resolución aplicada

- Se agregó `readApiResponse(response)`, usado por ambas solicitudes.
- El helper convierte fallos de parseo y valores JSON de tipo nulo, primitivo o arreglo en un error explícito: “El servidor devolvió una respuesta inválida.”
- Las respuestas HTTP válidas de error siguen mostrando `result.error`; los fallos de red y errores del catálogo continúan llegando a sus bloques `catch` y no se convierten en éxito.
- El estado de envío se conserva y el botón se reactiva en `finally`.

## Verificación

Se comprobó por inspección que las dos llamadas pasan por el helper y que la carga del menú/checkout aún propagan el error a su UI. No se simuló en navegador una respuesta HTML, vacía o malformada. Node.js/npm tampoco están disponibles para ejecutar la suite.

## Riesgo residual y mejora recomendada

El helper valida formato general, no el esquema específico de cada status: una respuesta `{}` es JSON válido y los consumidores todavía deben comprobar `products`/`order` antes de usarlos. También faltan timeout y cancelación de solicitudes de red lentas, una política de reintento para catálogo y pruebas de integración que simulen respuestas 502/503 no JSON.
