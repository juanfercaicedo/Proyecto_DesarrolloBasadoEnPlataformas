# Auditoría del Primer Bosquejo

## Hallazgos priorizados

| Prioridad | Ubicación | Problema | Corrección propuesta |
| --- | --- | --- | --- |
| Crítica | `index.html` | No existe JavaScript: los botones `+` no agregan productos, no hay carrito, total ni confirmación. | Añadir una capa vanilla JS con estado del carrito, cantidades, total y panel de resumen accesible. |
| Alta | `index.html` | La barra móvil `mobile-order` solo apunta al menú y no refleja el pedido. | Convertirla en un CTA persistente que muestre cantidad y total y abra el carrito. |
| Alta | `index.html` | No se elige modalidad antes de pedir. | Añadir selector visible para Delivery, Para llevar y En restaurante; conservar la elección en el estado del pedido. |
| Alta | `index.html` | No hay personalización de productos. | Abrir un modal o drawer al pulsar agregar, con extras y exclusiones sencillas y actualización inmediata del precio. |
| Alta | `index.html` | Las categorías son enlaces visuales y no filtran el menú; varios destinos (`#menu-completo`, `#acompanamientos`, `#bebidas`, `#postres`) no existen. | Implementar filtros accesibles y mostrar categorías disponibles o conectar los enlaces a contenido real. |
| Media | `index.html` | Hay destinos inexistentes como `#como-llegar`, `#instagram` y `#contacto`. | Sustituirlos por acciones reales o enlaces externos válidos; evitar navegación rota. |
| Media | `index.html` | La ubicación usa un mapa decorativo y solo muestra una sede sin acción funcional. | Mantener el mapa como placeholder, pero añadir dirección, horario, selección de sede y enlace válido a mapas. |
| Media | `index.html` | Las imágenes son remotas y no declaran carga diferida. | Añadir `loading="lazy"` y `decoding="async"` a imágenes que no sean la principal; conservar `alt` descriptivo. |
| Media | `styles.css` | Hay transiciones sin alternativa para usuarios con sensibilidad al movimiento. | Añadir `@media (prefers-reduced-motion: reduce)` y desactivar transiciones/scroll suave allí. |
| Media | `index.html` y `styles.css` | Los controles de agregar no muestran estado después de la interacción. | Añadir estados de foco, cantidad y mensajes `aria-live`; conservar objetivos táctiles de al menos 44-48 px. |
| Baja | `index.html` | La interfaz no expone alérgenos ni información adicional del producto. | Añadir etiquetas visibles para vegetariano, picante y alérgenos relevantes en el drawer. |

## Requisitos funcionales

1. Mantener la identidad visual actual y la navegación libre sin registro.
2. Añadir selección de modalidad de pedido antes de confirmar un producto.
3. Permitir agregar productos, cambiar cantidades, eliminar líneas y recalcular el total.
4. Permitir una personalización sencilla por producto, con extras que modifiquen el precio.
5. Mostrar el carrito en un drawer o modal accesible desde desktop y móvil.
6. Mostrar cantidad, total y estado del pedido en la barra móvil y en el encabezado.
7. Usar `aria-label`, `aria-expanded`, `aria-controls`, foco visible y una región `aria-live`.
8. Mantener una ruta de confirmación local, sin fingir una pasarela de pago ni un backend.
9. Hacer que las categorías funcionen como filtros o que indiquen claramente su disponibilidad.
10. Añadir carga diferida a imágenes secundarias y soporte para `prefers-reduced-motion`.

## Criterios de aceptación

- Al pulsar un botón de producto se abre una personalización o se agrega el producto y el contador cambia.
- El total del carrito coincide con precio por cantidad más extras.
- Se puede cambiar Delivery, Para llevar o En restaurante y la modalidad queda visible.
- El carrito se puede abrir, cerrar y completar con teclado; el foco no queda perdido.
- La barra móvil muestra el estado real del pedido y funciona en pantallas pequeñas.
- Las categorías activan un estado visible y no producen enlaces rotos.
- No aparecen errores de JavaScript al cargar ni al usar los controles.
- En móvil no hay desbordamiento horizontal accidental fuera de las áreas diseñadas para desplazarse.
- Con movimiento reducido activo no se ejecutan transiciones esenciales.
- Las imágenes tienen textos alternativos útiles y las actualizaciones del carrito se anuncian.

## Orden recomendado

1. Añadir la estructura semántica del selector de modalidad y del carrito.
2. Implementar el estado del pedido y los eventos de productos, cantidades y total.
3. Implementar personalización, extras y confirmación local.
4. Conectar la barra móvil, el botón del encabezado y los mensajes accesibles.
5. Implementar filtros de categorías y corregir destinos inexistentes.
6. Añadir mejoras de carga, foco, movimiento reducido y pruebas responsive.