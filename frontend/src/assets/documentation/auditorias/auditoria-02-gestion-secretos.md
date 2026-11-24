# Auditoría 2 — Gestión de secretos

**Fecha:** 23 de noviembre de 2026  
**Alcance:** `backend/src/database/seed.js`, `.gitignore` y configuración local.

## Hallazgo

El seed usaba una contraseña de administrador conocida cuando `ADMIN_PASSWORD` no estaba definido. Además, `.gitignore` solo excluía el archivo `.env`, no variantes como `.env.production`.

## Resolución aplicada

- El seed ahora exige `ADMIN_PASSWORD` de al menos 12 caracteres y termina con error explícito si falta.
- Se eliminó la contraseña por defecto.
- Se ignoran `.env.*` y se permite únicamente el archivo plantilla `.env.example`.
- Se documentaron variables de contraseña y clave administrativa para desarrollo local. Render ya genera `ADMIN_PASSWORD` y `ADMIN_API_KEY`.

## Verificación

El flujo de seed no llega a crear un administrador con una clave predecible. La validación de despliegue y de seed depende del entorno; no se ejecutó localmente porque Node.js no está disponible en esta máquina.
