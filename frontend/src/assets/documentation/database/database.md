```sql
DROP TABLE IF EXISTS ROL CASCADE;
CREATE TABLE ROL (
  id_rol INT PRIMARY KEY,
  nombre_rol VARCHAR(255)
);

DROP TABLE IF EXISTS USUARIO CASCADE;
CREATE TABLE USUARIO (
  id_usuario INT PRIMARY KEY,
  id_rol INT,
  id_supervisor INT,
  nombres VARCHAR(255),
  apellidos VARCHAR(255),
  correo VARCHAR(255),
  contrasena_hash VARCHAR(255),
  telefono VARCHAR(255)
);

DROP TABLE IF EXISTS CATEGORIA_PRODUCTO CASCADE;
CREATE TABLE CATEGORIA_PRODUCTO (
  id_categoria INT PRIMARY KEY,
  nombre_categoria VARCHAR(255)
);

DROP TABLE IF EXISTS PRODUCTO CASCADE;
CREATE TABLE PRODUCTO (
  id_producto INT PRIMARY KEY,
  id_categoria INT,
  id_usuario_admin INT,
  nombre VARCHAR(255),
  precio_venta_actual DECIMAL(10, 2),
  disponible BOOLEAN
);

DROP TABLE IF EXISTS INGREDIENTE CASCADE;
CREATE TABLE INGREDIENTE (
  id_ingrediente INT PRIMARY KEY,
  nombre VARCHAR(255),
  unidad_medida VARCHAR(255),
  stock_minimo DECIMAL(10, 2)
);

DROP TABLE IF EXISTS LOTE_INGREDIENTE CASCADE;
CREATE TABLE LOTE_INGREDIENTE (
  id_lote INT PRIMARY KEY,
  id_ingrediente INT,
  id_usuario_admin INT,
  codigo_lote VARCHAR(255),
  fecha_ingreso TIMESTAMP,
  fecha_vencimiento DATE,
  cantidad_inicial DECIMAL(10, 2),
  cantidad_disponible DECIMAL(10, 2)
);

DROP TABLE IF EXISTS RECETA CASCADE;
CREATE TABLE RECETA (
  id_receta INT PRIMARY KEY,
  id_producto INT,
  id_ingrediente INT,
  cantidad_necesaria DECIMAL(10, 2)
);

DROP TABLE IF EXISTS TIPO_PEDIDO CASCADE;
CREATE TABLE TIPO_PEDIDO (
  id_tipo_pedido INT PRIMARY KEY,
  descripcion VARCHAR(255)
);

DROP TABLE IF EXISTS ESTADO_PEDIDO CASCADE;
CREATE TABLE ESTADO_PEDIDO (
  id_estado_pedido INT PRIMARY KEY,
  descripcion VARCHAR(255)
);

DROP TABLE IF EXISTS PEDIDO CASCADE;
CREATE TABLE PEDIDO (
  id_pedido INT PRIMARY KEY,
  id_usuario INT,
  id_tipo_pedido INT,
  id_estado_pedido INT,
  fecha_hora TIMESTAMP,
  total DECIMAL(10, 2),
  direccion_entrega VARCHAR(255)
);

DROP TABLE IF EXISTS DETALLE_PEDIDO CASCADE;
CREATE TABLE DETALLE_PEDIDO (
  id_detalle INT PRIMARY KEY,
  id_pedido INT,
  id_producto INT,
  cantidad INT,
  precio_unitario_historico DECIMAL(10, 2)
);

DROP TABLE IF EXISTS METODO_PAGO CASCADE;
CREATE TABLE METODO_PAGO (
  id_metodo_pago INT PRIMARY KEY,
  descripcion VARCHAR(255)
);

DROP TABLE IF EXISTS PAGO CASCADE;
CREATE TABLE PAGO (
  id_pago INT PRIMARY KEY,
  id_pedido INT,
  id_metodo_pago INT,
  id_usuario_admin INT,
  monto DECIMAL(10, 2),
  referencia_banco VARCHAR(255),
  fecha_pago TIMESTAMP
);

DROP TABLE IF EXISTS FACTURA CASCADE;
CREATE TABLE FACTURA (
  id_factura INT PRIMARY KEY,
  id_pedido INT,
  fecha_emision TIMESTAMP,
  ruc_cedula_cliente VARCHAR(255),
  razon_social VARCHAR(255),
  subtotal_facturado DECIMAL(10, 2),
  impuestos_facturados DECIMAL(10, 2),
  total_facturado DECIMAL(10, 2)
);

DROP TABLE IF EXISTS ESTADO_ORDEN CASCADE;
CREATE TABLE ESTADO_ORDEN (
  id_estado_orden INT PRIMARY KEY,
  descripcion VARCHAR(255)
);

DROP TABLE IF EXISTS ORDEN_SALIDA CASCADE;
CREATE TABLE ORDEN_SALIDA (
  id_orden_salida INT PRIMARY KEY,
  id_pedido INT,
  id_usuario_despacha INT,
  id_estado_orden INT,
  fecha_despacho TIMESTAMP
);
```