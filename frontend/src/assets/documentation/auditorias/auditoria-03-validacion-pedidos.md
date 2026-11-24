# Auditoría 3 — Validación y límites del checkout

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Correcciones aplicadas y pruebas agregadas
**Alcance:** formulario de `frontend/index.html`, lógica del carrito en `frontend/src/assets/js/script.js` y validación de `backend/src/services/orderService.js`.

## Resumen ejecutivo

El backend ya tenía límites razonables para los pedidos, pero no todos estaban alineados con la interfaz ni con las columnas de base de datos. En especial, el carrito podía superar las 99 unidades que acepta el servidor, el nombre del formulario era más restrictivo que el servidor y la dirección de entrega no tenía límite de longitud en la validación del backend.

## Método y evidencia

Se compararon las restricciones del formulario, el almacenamiento local y `validatePayload` del servidor. El servidor admite entre 1 y 30 líneas, de 1 a 99 unidades por línea y extras de 0 o 150 centavos. Valida nombre de 2 a 100 caracteres, teléfono de 7 a 15 dígitos, correo de hasta 254 caracteres y, para Delivery, dirección obligatoria. En Prisma, `Pedido.direccion_entrega` es `VarChar(255)`.

Antes del cambio, el botón de incremento aumentaba la cantidad sin tope y el formulario limitaba el nombre a 80 caracteres. Por lo tanto, el usuario podía construir una solicitud que la interfaz no explicaba o no podía enviar, y el backend no detectaba una dirección demasiado larga hasta llegar a la persistencia.

## Hallazgos e impacto

- **Cantidad desalineada:** un carrito de 100 unidades era posible aunque el servidor rechaza más de 99; el usuario solo veía el rechazo al confirmar.
- **Nombre inconsistente:** el formulario truncaba/impedía valores entre 81 y 100 caracteres que sí admite el servidor.
- **Dirección sin máximo del lado servidor:** una llamada directa podía exceder la columna y terminar en un error de persistencia en vez de una respuesta de validación.
- **Datos locales fuera de rango:** el carrito guardado podía contener una cantidad antigua o manipulada que ya no satisficiera las reglas actuales.

## Resolución aplicada

1. El incremento desde el producto y desde el carrito se detiene en 99 y anuncia el límite en la región accesible.
2. La restauración del carrito rechaza cantidades inferiores a 1 o superiores a 99.
3. `maxlength` del nombre quedó en 100, alineado con el servidor.
4. `validatePayload` exige para Delivery una dirección recortada de 5 a 255 caracteres. El frontend ya marca el campo como obligatorio en esa modalidad y su máximo HTML coincide con 255.
5. Se conserva la validación en servidor: los atributos HTML son ayudas de UX, no controles de seguridad.

## Verificación

Se agregaron pruebas HTTP para rechazar 100 unidades y una dirección de 256 caracteres; la prueba existente verifica que Delivery sin dirección se rechaza antes de consultar la base. No se pudieron ejecutar localmente por falta de Node.js/npm. El análisis del editor no reportó errores en los archivos revisados.

## Riesgo residual

Las reglas de formato del correo/teléfono y el límite de direcciones deben mantenerse coordinados si cambian los requisitos. También conviene añadir pruebas de navegador para comprobar los mensajes nativos del formulario en teclado y móvil.
