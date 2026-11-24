import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { AppError } from "../errors/AppError.js";
import { createOrderTransaction } from "../repositories/orderRepository.js";

const orderModes = new Map([
  ["Delivery", "A Domicilio"],
  ["Para llevar", "Para Llevar"],
  ["En restaurante", "En Local"],
]);
const phonePattern = /^[0-9]{7,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new AppError(400, "El cuerpo del pedido no es válido.");
  }
  const customer = payload.customer;
  if (!customer || typeof customer.name !== "string" || customer.name.trim().length < 2 || customer.name.trim().length > 100) {
    throw new AppError(400, "El nombre debe tener entre 2 y 100 caracteres.");
  }
  if (typeof customer.phone !== "string" || !phonePattern.test(customer.phone)) {
    throw new AppError(400, "El teléfono debe contener entre 7 y 15 dígitos.");
  }
  if (typeof customer.email !== "string" || customer.email.length > 254 || !emailPattern.test(customer.email)) {
    throw new AppError(400, "Ingresa un correo electrónico válido.");
  }
  if (!orderModes.has(payload.mode)) {
    throw new AppError(400, "El tipo de pedido no es válido.");
  }
  if (payload.mode === "Delivery" && (typeof payload.address !== "string" || payload.address.trim().length < 5)) {
    throw new AppError(400, "La dirección es obligatoria para pedidos a domicilio.");
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 30) {
    throw new AppError(400, "El pedido debe contener entre 1 y 30 productos.");
  }
  if (payload.items.some((item) =>
    !item || typeof item.name !== "string" ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
    !Number.isInteger(item.extra) || ![0, 150].includes(item.extra)
  )) {
    throw new AppError(400, "Uno de los productos del pedido no es válido.");
  }
}

export async function createOrder(payload) {
  validatePayload(payload);

  return createOrderTransaction(async (transaction) => {
    const customerRole = await transaction.rol.findUnique({ where: { nombre_rol: "Cliente" } });
    const orderType = await transaction.tipoPedido.findUnique({ where: { descripcion: orderModes.get(payload.mode) } });
    const pendingStatus = await transaction.estadoPedido.findUnique({ where: { descripcion: "Pendiente" } });
    if (!customerRole || !orderType || !pendingStatus) {
      throw new AppError(503, "Faltan datos iniciales del sistema. Ejecuta npm run db:seed.");
    }

    const email = payload.customer.email.trim().toLowerCase();
    const [firstName, ...lastNames] = payload.customer.name.trim().split(/\s+/);
    const customer = await transaction.usuario.upsert({
      where: { correo: email },
      create: {
        id_rol: customerRole.id_rol,
        nombres: firstName,
        apellidos: lastNames.join(" ") || "Cliente",
        correo: email,
        telefono: payload.customer.phone,
        contrasena_hash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      },
      update: {
        nombres: firstName,
        apellidos: lastNames.join(" ") || "Cliente",
        telefono: payload.customer.phone,
      },
    });

    const details = [];
    for (const item of payload.items) {
      const product = await transaction.producto.findFirst({
        where: { nombre: item.name, disponible: true },
      });
      if (!product) throw new AppError(400, `El producto ${item.name} no está disponible.`);

      const unitPrice = Math.round(Number(product.precio_venta_actual) * 100) + item.extra;
      details.push({
        id_producto: product.id_producto,
        cantidad: item.quantity,
        precio_unitario_historico: (unitPrice / 100).toFixed(2),
        subtotal: unitPrice * item.quantity,
      });
    }

    const total = details.reduce((sum, item) => sum + item.subtotal, 0);
    const order = await transaction.pedido.create({
      data: {
        id_usuario: customer.id_usuario,
        id_tipo_pedido: orderType.id_tipo_pedido,
        id_estado_pedido: pendingStatus.id_estado_pedido,
        fecha_hora: new Date(),
        total: (total / 100).toFixed(2),
        direccion_entrega: payload.mode === "Delivery" ? payload.address.trim() : null,
        detalles: {
          create: details.map(({ subtotal: _subtotal, ...detail }) => detail),
        },
      },
      include: { detalles: true },
    });

    return { id: order.id_pedido, status: "Pendiente", total, createdAt: order.fecha_hora };
  });
}