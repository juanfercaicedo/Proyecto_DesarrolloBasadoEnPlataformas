# Auditoría 1 — Privacidad e integridad de datos de clientes

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Corrección aplicada; verificación de titularidad pendiente
**Alcance:** asociación de clientes y creación de pedidos en `backend/src/services/orderService.js`; control de acceso de recursos en `backend/src/routes/apiRoutes.js`.

## Resumen ejecutivo

El checkout es público y usa el correo proporcionado por quien compra para localizar al usuario al que se asocia el pedido. Antes de esta auditoría, la operación también sobrescribía el nombre y el teléfono de ese usuario. La modificación no exigía contraseña, sesión ni verificación del correo. Se eliminó la escritura sobre perfiles existentes, pero la asociación por correo todavía no demuestra que la persona que hizo el pedido sea su titular.

## Método y evidencia

Se siguió `POST /api/orders` desde la ruta pública hasta `createOrder` y el `upsert` de `Usuario`. La ruta de checkout no aplica `requireAdminKey`; esto es necesario para permitir pedidos desde el sitio, pero significa que el cuerpo de la solicitud no es identidad autenticada. El `upsert` busca por correo normalizado y, si ya existía un registro, antes copiaba `nombres`, `apellidos` y `telefono` del formulario a `update`.

Las rutas de consulta y administración de usuarios sí están protegidas por `requireAdminKey`. El hallazgo no fue una lectura pública de perfiles: fue la modificación de un perfil conocido por correo mediante una operación pública.

## Hallazgo, impacto y resolución

**Hallazgo:** un tercero podía enviar el correo de un usuario existente y cambiar su nombre o teléfono al crear un pedido.

**Impacto:** pérdida de integridad de datos de contacto y confusión operativa al atender pedidos. El correo por sí solo no constituye prueba de titularidad.

**Corrección aplicada:** el `upsert` conserva `where: { correo: email }` y los datos de creación para nuevos clientes, pero el bloque `update` quedó vacío (`update: {}`). Así el checkout puede seguir asociando el pedido sin modificar atributos de un usuario preexistente. La escritura de cliente y pedido permanece dentro de la transacción existente.

## Verificación

Se revisó el flujo de `createOrder`: los campos personales solo aparecen en `create`; no se agregaron pruebas con una base de datos real. La suite automatizada no se pudo ejecutar en este entorno por falta de Node.js/npm.

## Riesgo residual y mejora recomendada

Un atacante todavía puede enviar el correo de otra persona y asociar un pedido a su usuario, aunque ya no pueda alterar su perfil. Antes de mostrar historial, enviar notificaciones sensibles o permitir operaciones de cuenta, se debe implementar verificación de correo o autenticación y asociar el pedido a una identidad verificada. La API tampoco incluye actualmente un flujo de inicio de sesión de clientes.
