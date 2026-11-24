# Auditoría 8 — Correspondencia de categorías entre base de datos y menú

**Fecha:** 23 de noviembre de 2026  
- **Severidad:** Baja
- **Estado:** Corrección aplicada para categorías existentes; catálogo todavía tiene una fuente visual estática
**Alcance:** `backend/src/services/productService.js`, `backend/src/repositories/productRepository.js`, validación y renderizado de `frontend/src/assets/js/script.js`.

## Resumen ejecutivo

La API ya incluía el nombre de categoría de la base de datos, pero el renderizado del frontend asignaba la categoría “hamburguesas” a cada tarjeta. El filtro dependía así de un dato codificado y no del recurso que se recibía. Ahora cada tarjeta deriva su filtro de `product.category`, con normalización de acentos y separadores.

## Método y evidencia

Se siguió la respuesta pública de productos desde Prisma: `findAvailableProducts` incluye `categoria.nombre_categoria`, y `listProducts` agrega ese valor a cada entrada del catálogo. En cambio, `renderProducts` escribía antes `card.dataset.category = "hamburguesas"` de forma incondicional. Los filtros del HTML usan identificadores normalizados como `hamburguesas`, `acompanamientos`, `bebidas` y `postres`.

## Hallazgo e impacto

Una tarjeta de bebida o acompañamiento con metadatos de base de datos válidos podía quedar asignada al filtro equivocado y ser invisible al seleccionar su categoría. Además, una respuesta sin categoría válida se aceptaba y generaba una tarjeta que ningún botón podía mostrar.

## Resolución aplicada

- El renderizado usa `getProductCategory(product)`: normaliza Unicode, elimina marcas diacríticas, convierte a minúsculas y quita separadores no alfanuméricos.
- `isValidProduct` exige que `category` sea una cadena no vacía, junto con los demás campos usados para pintar el producto.
- El backend sigue siendo responsable de unir los productos disponibles con la metadata visual del catálogo; el cambio no expone atributos de base de datos sin filtrar.

## Verificación

Por inspección, “Hamburguesas” se normaliza al identificador existente `hamburguesas`, “Acompañamientos” a `acompanamientos` y “Bebidas” a `bebidas`. El editor no reportó errores en el script. No se realizó una prueba visual automatizada en navegador.

## Riesgo residual

La normalización no crea botones nuevos: una categoría de base de datos que no corresponda a uno de los filtros presentes no tendrá destino de navegación. Además, el contenido de nombre, descripción, imagen y distintivo procede del JSON del frontend; agregar un producto únicamente a la base no basta para publicarlo. Para un catálogo extensible, conviene administrar categorías y metadatos desde una única fuente y generar filtros a partir de ella.
