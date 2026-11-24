export { Prisma, PrismaClient } from "@prisma/client";
export { prisma } from "../database/prisma.js";
import { prisma } from "../database/prisma.js";

const resource = (name, delegate, idField, fields) => ({
	name,
	delegate,
	idField,
	fields,
});

export const models = {
	Rol: resource("Rol", prisma.rol, "id_rol", ["nombre_rol"]),
	Usuario: resource("Usuario", prisma.usuario, "id_usuario", ["id_rol", "id_supervisor", "nombres", "apellidos", "correo", "telefono", "contrasena_hash"]),
	CategoriaProducto: resource("CategoriaProducto", prisma.categoriaProducto, "id_categoria", ["nombre_categoria"]),
	Producto: resource("Producto", prisma.producto, "id_producto", ["id_categoria", "id_usuario_admin", "nombre", "precio_venta_actual", "disponible"]),
	Ingrediente: resource("Ingrediente", prisma.ingrediente, "id_ingrediente", ["nombre", "unidad_medida", "stock_minimo"]),
	Proveedor: resource("Proveedor", prisma.proveedor, "id_proveedor", ["nombre", "telefono", "id_ingrediente", "cantidad_por_pedido"]),
	LoteIngrediente: resource("LoteIngrediente", prisma.loteIngrediente, "id_lote", ["id_ingrediente", "id_usuario_admin", "codigo_lote", "fecha_ingreso", "fecha_vencimiento", "cantidad_inicial", "cantidad_disponible"]),
	Receta: resource("Receta", prisma.receta, "id_receta", ["id_producto", "id_ingrediente", "cantidad_necesaria"]),
	TipoPedido: resource("TipoPedido", prisma.tipoPedido, "id_tipo_pedido", ["descripcion"]),
	EstadoPedido: resource("EstadoPedido", prisma.estadoPedido, "id_estado_pedido", ["descripcion"]),
	Pedido: resource("Pedido", prisma.pedido, "id_pedido", ["id_usuario", "id_tipo_pedido", "id_estado_pedido", "fecha_hora", "total", "direccion_entrega"]),
	DetallePedido: resource("DetallePedido", prisma.detallePedido, "id_detalle", ["id_pedido", "id_producto", "cantidad", "precio_unitario_historico"]),
	MetodoPago: resource("MetodoPago", prisma.metodoPago, "id_metodo_pago", ["descripcion"]),
	Pago: resource("Pago", prisma.pago, "id_pago", ["id_pedido", "id_metodo_pago", "id_usuario_admin", "monto", "referencia_banco", "fecha_pago"]),
	Factura: resource("Factura", prisma.factura, "id_factura", ["id_pedido", "fecha_emision", "ruc_cedula_cliente", "razon_social", "subtotal_facturado", "impuestos_facturados", "total_facturado"]),
	EstadoOrden: resource("EstadoOrden", prisma.estadoOrden, "id_estado_orden", ["descripcion"]),
	OrdenSalida: resource("OrdenSalida", prisma.ordenSalida, "id_orden_salida", ["id_pedido", "id_usuario_despacha", "id_estado_orden", "fecha_despacho"]),
};