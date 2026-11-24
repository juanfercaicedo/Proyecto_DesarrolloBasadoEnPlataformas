# Auditoría 10 — Puerta de calidad antes de publicar GitHub Pages

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Media
- **Estado:** Trabajo de validación agregado; ejecución remota pendiente
**Alcance:** `.github/workflows/pages.yml`, scripts npm y pruebas de `backend/src/tests/api.test.js`.

## Resumen ejecutivo

El workflow publicaba los archivos estáticos al actualizar `main` sin ejecutar las pruebas del repositorio. Se incorporó un trabajo `validate` que prepara Node.js y Prisma y ejecuta `npm test`; el despliegue ahora depende de su éxito. Esto evita publicar automáticamente un cambio que rompa las verificaciones existentes.

## Método y evidencia

Se revisaron los disparadores, permisos, dependencias entre trabajos y comandos. Antes del cambio, el workflow tenía un único trabajo de despliegue: checkout, configuración de Pages, armado de `_site` y publicación. El proyecto declara Node.js 20 o posterior y define `db:generate` y `test` en `package.json`.

## Hallazgo e impacto

Sin una puerta de prueba, un fallo en validación, relaciones Prisma o código ejecutado por el backend no impedía publicar una nueva versión de frontend. Aunque una parte de los defectos solo aparece al ejecutar la API, el workflow de Pages era el único pipeline configurado y no validaba el contrato asociado.

## Resolución aplicada

El trabajo `validate`:

1. Usa `actions/setup-node@v4` con Node 20 y caché npm.
2. Ejecuta `npm ci` para instalar según el lockfile.
3. Genera el cliente con `npm run db:generate`.
4. Ejecuta `npm test` con una `DATABASE_URL` de prueba; las pruebas actuales validan rutas y lógica simulada sin requerir un PostgreSQL activo.
5. Limita los permisos del job de validación a `contents: read`.

El trabajo `deploy` declara `needs: validate`, por lo que no se ejecuta cuando falla la validación. Los permisos de Pages permanecen para el despliegue.

## Verificación

Se inspeccionó el YAML del workflow y se comprobó que la dependencia `needs: validate` antecede a los pasos de publicación. La suite no se pudo ejecutar localmente porque no hay Node.js/npm y la herramienta de pruebas de VS Code no detectó un controlador. El resultado de GitHub Actions todavía debe confirmarse al ejecutar el workflow.

## Riesgo residual y mejora recomendada

La CI actual no levanta PostgreSQL ni prueba migración/seed, consumo concurrente de inventario o interfaz en navegador. Tampoco ejecuta lint, análisis de accesibilidad o pruebas visuales. Antes de tratarla como certificación de producción, conviene agregar un servicio PostgreSQL para pruebas de integración y una prueba de navegador; además, revisar el resultado real del primer workflow tras estos cambios.
