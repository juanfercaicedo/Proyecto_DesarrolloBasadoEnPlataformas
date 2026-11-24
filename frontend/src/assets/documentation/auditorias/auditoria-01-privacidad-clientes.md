# Auditoría 1 — Privacidad de los datos de clientes

**Fecha:** 23 de noviembre de 2026  
**Alcance:** creación de pedidos y asociación de clientes en `backend/src/services/orderService.js`.

## Hallazgo

El alta del pedido hacía `upsert` por correo y actualizaba nombres y teléfono aunque el correo ya perteneciera a un usuario. El checkout público no autentica al cliente, por lo que cualquier visitante podía sobrescribir esos datos con solo enviar el correo.

## Resolución aplicada

El `upsert` ahora conserva los datos existentes (`update: {}`) y solo establece nombres y teléfono al crear el usuario. Así se mantiene la asociación transaccional del pedido sin permitir cambios no autenticados a los datos del perfil.

## Verificación y límite pendiente

La revisión del flujo confirma que el `update` no modifica campos de usuarios preexistentes. El checkout todavía no verifica la titularidad del correo; para atribuir pedidos con garantía a una persona se necesitaría verificación de correo o autenticación, fuera del flujo actual.
