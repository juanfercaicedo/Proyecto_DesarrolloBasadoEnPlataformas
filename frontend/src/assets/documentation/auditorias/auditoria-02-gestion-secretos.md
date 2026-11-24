# Auditoría 2 — Secretos, credenciales y configuración del seed

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Correcciones aplicadas; endurecimiento y rotación siguen siendo responsabilidad operativa
**Alcance:** `backend/src/database/seed.js`, `.gitignore`, `render.yaml` y guía local en `README.md`.

## Resumen ejecutivo

El seed generaba la cuenta de administrador con una contraseña fija y públicamente conocida cuando no se definía `ADMIN_PASSWORD`. Además, el repositorio ignoraba `.env`, pero no las variantes de nombre habituales para entornos. Se eliminó la contraseña por defecto, se hizo explícita la precondición del seed y se amplió la regla de exclusión de secretos.

## Método y evidencia

Se inspeccionaron las variables de entorno usadas al crear el administrador, el hash almacenado en `USUARIO`, el middleware que protege las rutas administrativas y el Blueprint de Render. Antes de la corrección, la expresión `process.env.ADMIN_PASSWORD ?? "cambia-esta-clave-antes-de-usar"` permitía sembrar una credencial predecible. El acceso a las rutas CRUD, por su parte, compara `x-admin-key` con `ADMIN_API_KEY`; es una credencial distinta de la contraseña guardada para el usuario administrador.

El Blueprint ya genera valores para `ADMIN_PASSWORD` y `ADMIN_API_KEY`. El riesgo del valor por defecto afectaba sobre todo instalaciones locales, despliegues manuales o configuraciones que omitieran esas variables.

## Hallazgos e impacto

1. **Contraseña por defecto conocida.** Podía persistirse una cuenta con una clave que no era exclusiva de la instalación. Aunque el middleware administrativo usa una clave separada, conservar una contraseña conocida amplía el riesgo ante futuros flujos de autenticación o reutilización de credenciales.
2. **Exclusión incompleta de archivos de entorno.** `.gitignore` solo cubría `.env`; nombres como `.env.production` podían terminar versionados por descuido.
3. **Configuración local incompleta.** La secuencia de desarrollo no mostraba que el seed necesita credenciales seguras.

## Resolución aplicada

- `seed.js` exige `ADMIN_PASSWORD` no vacío y de al menos 12 caracteres; ante incumplimiento, informa el requisito, desconecta Prisma y termina con código distinto de cero.
- Se eliminó cualquier fallback de contraseña.
- `.gitignore` excluye `.env.*` y deja explícitamente permitido `.env.example`.
- `README.md` documenta `ADMIN_PASSWORD` y `ADMIN_API_KEY` para desarrollo; Render conserva la generación automática de ambos valores.
- La contraseña continúa almacenándose como hash bcrypt; el seed no escribe el secreto en los logs.

## Verificación y límites

Se inspeccionó el flujo de error antes de cualquier operación de seed y se comprobó que la ruta de Render define ambas variables. No se ejecutó el seed ni `npm test`: Node.js/npm no están instalados en este entorno.

## Riesgo residual

La longitud mínima no garantiza entropía, rotación ni ausencia de reutilización. La clave `ADMIN_API_KEY` sigue siendo un secreto compartido de servicio, no una identidad por usuario; debe administrarse y rotarse en el proveedor de despliegue. Nunca se debe copiar su valor a `frontend/` o al repositorio.
