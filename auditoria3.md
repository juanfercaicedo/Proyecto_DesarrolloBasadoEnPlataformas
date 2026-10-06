# Auditoría 3 — sitio actual Brasa Viva

**Fecha:** 5 de octubre de 2026

**Alcance:** `src/index.html`, `src/styles.css` y `src/script.js`

**Referencia académica:** `resumen clases.md`, en particular HTML semántico y accesibilidad, diseño adaptable, CSS, JavaScript y DOM, y verificación manual de recomendaciones automáticas.

## Método

Se solicitó una segunda opinión al modelo local `llama3.1:8b` mediante Ollama. Su respuesta fue general y propuso cambios no sustentados por el código (por ejemplo, reemplazar supuestas variables globales, aunque el estado está encapsulado en una función autoejecutable). Esas sugerencias no se aceptaron como hallazgos. Los puntos siguientes se comprobaron manualmente en los archivos y no presuponen que el proyecto tenga backend o procesamiento real de pedidos.

Las proporciones de contraste se calcularon con la fórmula WCAG para luminancia relativa. Son valores del estado encontrado antes de aplicar las correcciones.

## Clasificación de prioridad

- **Crítica:** impide una función esencial o expone a usuarios/datos a un riesgo grave. No se encontraron hallazgos confirmados de esta prioridad.
- **Leve:** afecta accesibilidad o claridad de uso, pero existe una alternativa para completar la tarea.
- **Baja:** mejora de calidad o rendimiento sin bloquear el uso normal.

| Prioridad | Cantidad | Hallazgos |
| --- | ---: | --- |
| Crítica | 0 | Ninguno confirmado |
| Leve | 3 | Contraste, estado vacío de categorías, foco del carrito |
| Baja | 2 | Enlace de ubicación, carga de recursos |

## Hallazgos confirmados y solución

### 1. Contraste insuficiente en varios textos

**Ubicación:** `src/styles.css`, variables y reglas de color (aprox. líneas 5, 31, 40, 78 y 88).

**Prioridad del hallazgo:** Leve.

**Estado:** Corregido.

**Evidencia:** el rojo `#e3482e` se usa como texto sobre el fondo `#fffdf8` y como fondo con texto blanco; sus contrastes son, respectivamente, **3.95:1** y **4.01:1**. Ambos son inferiores al mínimo **4.5:1** de WCAG AA para texto normal. En el banner promocional, el amarillo `#f6bb3e` sobre rojo `#e3482e` alcanza solo **2.31:1**; también falla para el texto pequeño del rótulo. El mismo rojo como texto hover en el footer, sobre `#1e1e1b`, alcanza solo **4.16:1**.

**Impacto:** parte de los textos pequeños puede resultar difícil de leer para personas con baja visión o en pantallas con reflejos.

**Solución aplicada — prioridad leve:**

1. Se oscureció el rojo de marca y se verificaron sus contrastes con texto blanco y con el fondo papel.
2. Se cambió el texto pequeño promocional a color papel y se conservó el amarillo únicamente para el texto grande cuyo contraste supera 3:1.
3. Se asignó amarillo al hover de los enlaces del footer para distinguir su tratamiento sobre fondo oscuro; se verificaron los pares de contraste afectados.

### 2. Filtros que muestran una categoría vacía sin explicarlo

**Ubicación:** `src/index.html` (aprox. líneas 64–68 y 72–84), `src/script.js` (manejador de categorías).

**Prioridad del hallazgo:** Leve.

**Estado:** Corregido.

**Evidencia:** hay filtros para hamburguesas, acompañamientos, bebidas y postres, pero las tres tarjetas disponibles tienen `data-category="hamburguesas"`. Al elegir cualquiera de las otras categorías, el script oculta todas las tarjetas; no presenta un mensaje de estado vacío.

**Impacto:** parece que el filtro o el menú no cargó, y no se informa que esas categorías todavía no tienen productos.

**Solución aplicada — prioridad leve:**

1. Se conservaron los filtros y se añadió una región `role="status"` que muestra “Aún no hay productos en esta categoría” si la selección no tiene artículos.
2. La región se oculta cuando se elige una categoría con productos y el cambio se anuncia mediante la región viva existente.
3. Se comprobó en navegador el estado vacío y la restauración de los productos al volver a “Hamburguesas”.

### 3. Enlace de ubicación con destino inexistente

**Ubicación:** `src/index.html` (aprox. línea 98).

**Prioridad del hallazgo:** Baja.

**Estado:** Corregido.

**Evidencia:** el enlace “Cómo llegar” apunta a `#como-llegar`, pero no hay ningún elemento con `id="como-llegar"` en el documento.

**Impacto:** al activarlo no se abre una ruta ni se lleva al usuario a información de cómo llegar.

**Solución aplicada — prioridad baja:**

1. Se reemplazó el fragmento roto con una búsqueda de Google Maps que utiliza la dirección ya mostrada en la tarjeta.
2. El enlace permanece en la misma pestaña; su nombre accesible identifica Google Maps y la dirección.

### 4. El foco del teclado se pierde al cambiar una cantidad del pedido

**Ubicación:** `src/script.js`, controlador de clics de `cartList` y llamada a `renderCart()` (aprox. líneas 124–140).

**Prioridad del hallazgo:** Leve.

**Estado:** Corregido.

**Evidencia:** al pulsar `+` o `−`, el script vuelve a crear todos los elementos de `cartList` con `replaceChildren()`. Eso elimina el botón que tenía el foco; el código no restaura el foco ni actualiza `region-aria-live` para anunciar el nuevo estado.

**Impacto:** quien use teclado o lector de pantalla puede perder la posición de navegación y no saber si cambió la cantidad o el total.

**Solución aplicada — prioridad leve:**

1. Se guarda la acción y el artículo antes del renderizado; después, el foco vuelve al botón equivalente.
2. Si se elimina el artículo, el foco pasa a un control cercano o al título enfocable del pedido.
3. Se anuncian la cantidad, la eliminación y el total. El incremento, decremento y eliminación del último artículo se probaron en navegador.

### 5. Recursos secundarios sin carga diferida y conexión repetida

**Ubicación:** `src/index.html` (aprox. líneas 9–10 y 43, 73, 78, 83, 92).

**Prioridad del hallazgo:** Baja.

**Estado:** Corregido.

**Evidencia:** hay dos enlaces idénticos `preconnect` a `fonts.gstatic.com`. Las imágenes del menú y de la promoción no especifican `loading="lazy"` ni `decoding="async"`.

**Impacto:** la conexión preestablecida está duplicada sin beneficio, y el navegador puede descargar imágenes fuera de la primera vista antes de que sean necesarias.

**Solución aplicada — prioridad baja:**

1. Se eliminó el `preconnect` duplicado.
2. Se añadió `loading="lazy"` y `decoding="async"` a las imágenes secundarias del menú y de la promoción.
3. La imagen principal del hero conserva su carga inicial para no retrasar el contenido principal.

## Hallazgos no confirmados / aspectos correctos

- No se encontró evidencia en estos archivos de uso de `eval()` ni de inserción de datos del carrito mediante `innerHTML`; los nombres se insertan usando `textContent`.
- El estado del carrito está dentro de una función autoejecutable, por lo que no se confirma la afirmación previa de que `cart` sea una variable global.
- La hoja de estilos ya incluye diseño adaptable, estilos de foco visible y una regla `prefers-reduced-motion`.
- La interfaz confirma el pedido solo con un mensaje local; esta auditoría no la considera una operación de servidor ni una venta procesada.

## Criterios de verificación después de corregir

- Los pares de texto normal alcanzan contraste WCAG AA de al menos 4.5:1; el texto grande alcanza al menos 3:1.
- Las categorías sin productos informan el estado vacío y las categorías con productos siguen filtrando correctamente.
- “Cómo llegar” abre el destino de mapa asociado a la dirección mostrada.
- Los controles de cantidad conservan el foco y anuncian los cambios a tecnologías de asistencia.
- Solo queda un `preconnect` a `fonts.gstatic.com`; las imágenes secundarias usan carga diferida y la imagen principal sigue cargando al inicio.
- No se introducen errores de consola ni se alteran el cálculo del carrito, la navegación existente o la visualización responsive.

## Correcciones aplicadas y validación

- Se cambió el rojo de marca a `#b8321f` y el rótulo pequeño y el texto descriptivo de la promoción ahora usan el color papel. El título amarillo conserva su color porque es texto grande.
- El hover de los enlaces del footer usa amarillo sobre el fondo oscuro, en vez del rojo de los enlaces sobre fondos claros.
- Se agregó un estado vacío `role="status"` para las categorías sin productos, sin alterar los filtros ni las tarjetas existentes.
- “Cómo llegar” ahora busca en Google Maps la dirección mostrada en la tarjeta.
- Al modificar cantidades se vuelve a enfocar el control equivalente; si el producto se elimina, el foco pasa al siguiente control disponible o al título del pedido. La región viva anuncia cantidad/eliminación y total.
- Se quitó el `preconnect` duplicado. Las tres imágenes del menú y la imagen de promoción cargan de forma diferida y usan decodificación asíncrona; la imagen del hero no se difiere.

**Validación ejecutada:**

- `node --check src/script.js`: correcto.
- Diagnósticos del editor en `src/index.html`, `src/styles.css` y `src/script.js`: sin errores.
- Aserciones directas con Node sobre estructura HTML/JS/CSS: correctas para estado vacío, filtros, dirección y enlace de mapas, conservación/anuncio del foco y cantidades, `preconnect` único y carga de imágenes.
- Cálculo directo de contraste WCAG: blanco sobre rojo **5.98:1**; rojo sobre papel **5.88:1**; amarillo sobre rojo **3.44:1** (título grande); amarillo hover sobre footer oscuro **9.63:1**; etiqueta veggie **5.20:1**; texto de descripción de producto **4.62:1**. También se verificaron los enlaces hover sobre fondos claros.
- Prueba funcional en navegador local: al elegir “Bebidas” se muestra el estado vacío; al pulsar `+`, el foco vuelve al control de incremento y se anuncia la cantidad/total; al quitar la última unidad, el foco pasa al título enfocable y el carrito queda vacío.
- Prueba responsive en navegador a **390 × 844 px**: la página no presenta desbordamiento horizontal (ancho de documento 375 px); la rejilla de productos conserva su desplazamiento horizontal intencional y el botón móvil de pedido está visible.
- `git diff --check` no se pudo ejecutar porque el comando `git` no está disponible en este entorno.
- No se realizó una prueba con lector de pantalla ni se navegó externamente a Google Maps.

**Estado:** correcciones aplicadas y verificaciones automatizadas indicadas arriba completadas.
