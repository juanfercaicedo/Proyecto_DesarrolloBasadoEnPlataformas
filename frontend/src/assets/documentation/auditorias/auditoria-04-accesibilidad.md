# Auditoría 4 — Accesibilidad del carrito y contraste

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Leve
- **Estado:** Correcciones de código aplicadas; falta comprobación asistida en navegador
**Alcance:** diálogo de pedido en `frontend/index.html`, ciclo de foco de `frontend/src/assets/js/script.js` y colores de `frontend/src/assets/css/styles.css`.

## Resumen ejecutivo

El carrito se declara diálogo modal, atrapa el foco con teclado y oculta condicionalmente la dirección. El selector usado para atrapar el foco no consideraba que un control podía estar dentro de un ancestro `hidden`. También se encontró que el contador del carrito referenciaba una variable CSS de primer plano no definida. Se corrigieron ambos defectos sin cambiar la estructura general del diálogo.

## Método y evidencia

Se contrastaron los atributos `role="dialog"`, `aria-modal`, `aria-hidden` y el control de apertura/cierre con el código que administra `Tab`, `Shift+Tab` y `Escape`. El ciclo construía la lista de foco con `button:not([disabled]), input:not([disabled]), [href], [tabindex]`; los descendientes de un contenedor oculto siguen coincidiendo con un selector CSS aunque no sean visibles.

El campo `#delivery-address` está dentro de `#delivery-address-field`, que recibe el atributo HTML `hidden` cuando la modalidad no es Delivery. El mismo CSS declaraba `color: var(--red-foreground)` para el número del carrito, pero no había definición de esa variable en `:root` ni en `body[data-theme="dark"]`.

## Hallazgos e impacto

1. **Foco en control invisible:** al navegar el diálogo con tabulación y una modalidad sin Delivery, el foco podía pasar al campo de dirección oculto. Esto desorienta a personas que dependen del teclado y puede producir un foco visual inexistente.
2. **Color sin valor definido:** el navegador descarta una declaración `color` que contiene una variable inexistente; el contador hereda un color no elegido para el fondo rojo. La legibilidad depende entonces de herencia accidental y cambia entre temas.

## Resolución aplicada

- El ciclo de foco ahora filtra los elementos que tengan un ancestro `[hidden]`. Se mantiene el retorno de foco al control que abrió el diálogo y la salida con `Escape`.
- Se definió `--red-foreground` con color claro en tema claro y color oscuro en tema oscuro, acompañando los fondos rojo oscuro y rojo claro respectivos.

## Verificación

El análisis estático del editor no reportó errores y se revisó que el campo condicional quede fuera de la lista de foco. No se realizó una sesión real con lector de pantalla ni una auditoría automatizada WCAG; por eso la corrección se considera revisada en código, no certificada.

## Riesgo residual y seguimiento

La prueba final debe recorrer apertura, navegación con `Tab`/`Shift+Tab`, cambio de modalidad, cierre con `Escape` y retorno de foco, en ambos tamaños de pantalla y temas. También se recomienda medir los pares de contraste con una herramienta WCAG y probar un lector de pantalla antes de declarar conformidad.
