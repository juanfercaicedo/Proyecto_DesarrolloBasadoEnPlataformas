# Documentación del Sistema - Restaurante

## 1. Levantamiento de Requerimientos y Flujo de Información

**Requerimientos Generales:**

- **Gestión de Usuarios:** Registro e inicio de sesión con roles definidos (Cliente, Cajero, Administrador).
- **Catálogo Digital:** Visualización de productos clasificados por categoría y disponibilidad.
- **Módulo de Caja (POS):** Toma de pedidos, asignación de tipo (llevar/local), y generación de pago.
- **Gestión de Inventario y Recetas:** Control de stock de materias primas que se descuenta automáticamente con cada venta.

**Flujo de Información (Paso a paso):**

1. **Ingreso (Login):** El usuario interactúa con la tabla `USUARIO` para validarse y el sistema lee su `ROL` para mostrarle la interfaz adecuada (Menú de cliente o Pantalla POS de cajero).
2. **Selección de Productos:** El cajero o cliente navega por las `CATEGORIA_PRODUCTO` y selecciona un `PRODUCTO` (validando el campo `disponible = true`).
3. **Encargo (Carrito/Comanda):** Los productos seleccionados se guardan temporalmente. Se elige el `TIPO_PEDIDO` (Mesa, Para Llevar, Domicilio).
4. **Paso al Cajero y Pago:** Se consolida el `PEDIDO`. El cajero registra el pago (Tabla `PAGO`), ingresando el `monto`, `metodo_pago` y `referencia_banco`.
5. **Actualización de Estados:** El `PEDIDO` cambia de estado (Tabla `ESTADO_PEDIDO`), por ejemplo de "Pendiente" a "Pagado" y luego a "En Preparación".
6. **Descuento de Inventario:** Automáticamente, el sistema lee la `RECETA` de cada producto vendido y resta las cantidades proporcionales de la tabla `INGREDIENTE`.

---

## 2. Tipos de Inventario

De acuerdo a la arquitectura de la base de datos, el sistema maneja un modelo de **Inventario de Materia Prima e Inventario Teórico**:

- **Inventario de Materia Prima (Insumos):** Controlado por la tabla `INGREDIENTE` (ej. Pan, Carne, Tomate). Se monitorea mediante los campos `stock_actual` y `stock_minimo` (para generar alertas de reabastecimiento).
- **Inventario Teórico/Deductivo:** Los productos finales (tabla `PRODUCTO`) no tienen un stock físico como tal en este modelo. Su disponibilidad depende de que existan los ingredientes suficientes definidos en su `RECETA`. Al registrarse una venta, el sistema deduce dinámicamente sus componentes.

---

## 3. Pantalla de Punto de Venta Físico (POS)

El diseño de la interfaz de la pantalla de caja (UI/UX) está estructurado en 3 bloques principales:

- **Panel Izquierdo/Central (Menú):** Una cuadrícula visual con filtros superiores por categorías (Hamburguesas, Bebidas, etc.). Cada producto se representa como un botón táctil (Touch-friendly) que muestra su nombre y el `precio_venta`.
- **Panel Derecho (Comanda/Detalle):** Una lista tipo recibo que representa la tabla `DETALLE_PEDIDO`. Muestra los productos seleccionados, botones de `[+]` y `[-]` para ajustar la cantidad, y el `subtotal` por cada ítem.
- **Panel Inferior Derecho (Acciones):**
  - Selector de `TIPO_PEDIDO` (Llevar / Comer aquí).
  - Monto total calculado (`total`).
  - Botones de acción principales: **"Cancelar"** y **"Pagar"**. Al presionar "Pagar", se despliega un modal para ingresar la forma de pago y generar el registro correspondiente en la tabla `PAGO`.

---

## 4. Transporte (Para pedir o para llevar)

Este requerimiento se resuelve utilizando la relación entre las tablas `TIPO_PEDIDO` y `PEDIDO`:

- **Catálogo de Tipos (`TIPO_PEDIDO`):** Se manejan registros base como: `1: Consumo Local`, `2: Para Llevar (Takeout)`, `3: A Domicilio (Delivery)`.
- **Manejo de la Dirección de Entrega:** Condicionado en la tabla `PEDIDO` a través del campo `direccion_entrega`.
  - Si el pedido es de _Tipo 1 o 2_ (Consumo Local o Para Llevar), el campo `direccion_entrega` queda en blanco (`NULL`) o se asigna por defecto como "Mostrador".
  - Si el pedido es de _Tipo 3_ (A Domicilio), el sistema hace obligatorio el ingreso de la `direccion_entrega`.

---

## 5. Diagrama Físico de la Base de Datos a Mano (Tamaño Plano)

**Instrucciones de maquetado físico del diagrama ERD:**

1. **Formato y Presentación:** Utilizar formato A3 (o 4 hojas A4 unidas por el reverso). En la esquina inferior derecha se incluye un cajetín arquitectónico con: Nombre del Autor, Fecha de elaboración, Título ("Modelo Físico de Base de Datos - Sistema Restaurante") y Versión (1.0).
2. **Estructura de las Tablas:** Cada entidad se dibuja como una caja rectangular dividida en 3 secciones horizontales:
   - _Cabecera:_ Nombre de la tabla en MAYÚSCULAS.
   - _Sección 1 (Claves Primarias):_ Identificador PK seguido de su tipo de dato (ej. `id_usuario INT PK`), subrayado para destacar.
   - _Sección 2 (Columnas Regulares):_ Atributos restantes con su tipo de dato físico específico (ej. `VARCHAR(100)`, `DECIMAL(10,2)`, `BOOLEAN`, `DATETIME`).
3. **Relaciones (Notación Pata de Gallo / Crow's Foot):** Las llaves foráneas (FK) se unen con las primarias mediante líneas conectoras. En el lado de la FK (cardinalidad "muchos") se dibuja un círculo y tres líneas divergentes ("pata de gallo"). En el lado de la PK (cardinalidad "uno") se traza una línea intersectada por dos pequeñas líneas verticales.
