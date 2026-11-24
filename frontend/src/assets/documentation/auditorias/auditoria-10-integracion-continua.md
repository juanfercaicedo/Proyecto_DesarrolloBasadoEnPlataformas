# Auditoría 10 — Verificación antes de publicar

**Fecha:** 23 de noviembre de 2026  
**Alcance:** `.github/workflows/pages.yml`.

## Hallazgo

El workflow desplegaba GitHub Pages sin ejecutar las pruebas del repositorio. Una regresión en validaciones o contratos podía llegar al sitio publicado sin ser detectada.

## Resolución aplicada

Se agregó un trabajo previo que configura Node.js 20, instala dependencias, genera el cliente Prisma y ejecuta `npm test`. El despliegue depende de que ese trabajo termine correctamente.

## Verificación

El workflow incluye una URL de PostgreSQL de prueba para las comprobaciones que no requieren una base activa. No se pudo ejecutar `npm test` en este entorno porque Node.js/npm no están instalados; el resultado del trabajo de CI deberá confirmarse en GitHub Actions.
