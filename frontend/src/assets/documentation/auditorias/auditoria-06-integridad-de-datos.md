# Auditoría 6 — Integridad de datos en el CRUD administrativo

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Validaciones de entrada aplicadas; reglas relacionales avanzadas pendientes
**Alcance:** `backend/src/services/resourceService.js`, `backend/src/models/index.js` y manejo de errores.

## Resumen ejecutivo

El CRUD genérico limitaba los nombres de campos permitidos, pero delegaba casi toda la validación de valores a Prisma/PostgreSQL. Esto permitía enviar magnitudes negativas o cantidades inválidas y recibir errores tardíos, además de dejar que algunos valores inválidos afectaran cálculos de inventario y facturación. Se agregaron validaciones explícitas antes de llamar al repositorio.

## Método y evidencia

Se revisó cómo `models/index.js` declara los campos editables de cada recurso y cómo `createResourceService.sanitize` filtra el cuerpo HTTP. El filtro por allowlist evita que el cliente inyecte nombres de columna, pero no comprueba el rango de los valores aceptados. La base define, entre otros, importes decimales, cantidades enteras, relaciones opcionales y requerimientos de receta decimales.

## Hallazgos e impacto

- Un importe negativo podía distorsionar el precio, monto de pago o total de factura.
- Un `stock_minimo`, saldo disponible o cantidad de receta negativa podía producir alertas y consumos sin sentido.
- Identificadores cero, negativos, decimales o no seguros podían llegar a Prisma como referencias inválidas.
- `cantidad` de detalle no tenía una regla de entero positivo en la capa de negocio.
- La base finalmente rechazaba algunas combinaciones, pero el contrato API no daba un 400 de validación consistente.

## Resolución aplicada

`sanitize` valida cada campo admitido antes de enviarlo al repositorio:

- Los campos `id_*` deben ser enteros seguros positivos; `null` se admite únicamente para `Usuario.id_supervisor`, `Pago.id_usuario_admin` y `OrdenSalida.id_usuario_despacha`.
- `cantidad` debe ser entero positivo.
- `cantidad_inicial` y `cantidad_necesaria` deben ser mayores que cero.
- Los importes y medidas decimales configurados deben ser finitos y no negativos; `null` y cadenas vacías no se convierten silenciosamente en cero.
- Las entradas inválidas producen `AppError(400, ...)` con un mensaje de campo, sin intentar la escritura.

La allowlist y el hash de contraseña existentes se mantienen; el hash no se acepta directamente en el cuerpo.

## Verificación

Se añadió una prueba HTTP para comprobar que un `stock_minimo` negativo devuelve 400 antes de acceder a la base, y una prueba de servicio para rechazar `null` en una relación obligatoria. También se revisaron las excepciones de relaciones opcionales. No fue posible ejecutar las pruebas por falta de Node.js/npm.

## Riesgo residual

No se cubren todavía límites máximos de precisión/escala de `Decimal(10, n)`, formatos de fecha, consistencia de `cantidad_disponible <= cantidad_inicial`, ni que la unidad de una receta coincida con la unidad del ingrediente. Esas reglas requieren validaciones específicas por recurso y, en ciertos casos, comparar el estado previo del registro. Las restricciones únicas y referenciales siguen siendo la última barrera en base de datos.
