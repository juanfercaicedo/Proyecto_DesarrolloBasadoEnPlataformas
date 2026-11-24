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

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function consumeIngredientStock(transaction, requirements, today = new Date()) {
  const grouped = new Map();
  for (const requirement of requirements) {
    const current = grouped.get(requirement.id_ingrediente) ?? {
      name: requirement.name,
      quantityMilli: 0,
    };
    current.quantityMilli += requirement.quantityMilli;
    grouped.set(requirement.id_ingrediente, current);
  }

  const currentDay = startOfUtcDay(today);
  for (const [ingredientId, requirement] of [...grouped].sort(([left], [right]) => left - right)) {
    let remainingMilli = requirement.quantityMilli;
    const lots = await transaction.loteIngrediente.findMany({
      where: {
        id_ingrediente: ingredientId,
        fecha_vencimiento: { gte: currentDay },
        cantidad_disponible: { gt: 0 },
      },
      orderBy: [{ fecha_vencimiento: "asc" }, { id_lote: "asc" }],
      select: { id_lote: true, cantidad_disponible: true },
    });

    for (const lot of lots) {
      const availableMilli = Math.round(Number(lot.cantidad_disponible) * 1000);
      const amountMilli = Math.min(availableMilli, remainingMilli);
      if (amountMilli <= 0) continue;

      const amount = amountMilli / 1000;
      const result = await transaction.loteIngrediente.updateMany({
        where: {
          id_lote: lot.id_lote,
          cantidad_disponible: { gte: amount },
        },
        data: { cantidad_disponible: { decrement: amount } },
      });
      if (result.count === 1) remainingMilli -= amountMilli;
      if (remainingMilli === 0) break;
    }

    if (remainingMilli > 0) {
      throw new AppError(409, `Inventario insuficiente para ${requirement.name}.`);
    }
  }
}

function validatePayload(payload, customerSession) {
  if (!payload || typeof payload !== "object") {
    throw new AppError(400, "El cuerpo del pedido no es válido.");
  }
  if (!customerSession) {
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
  }
  if (!orderModes.has(payload.mode)) {
    throw new AppError(400, "El tipo de pedido no es válido.");
  }
  if (payload.mode === "Delivery") {
    const hasSavedAddress = customerSession &&
      Number.isSafeInteger(payload.addressId) &&
      payload.addressId > 0;
    const hasNewAddress = typeof payload.address === "string" &&
      payload.address.trim().length >= 5 &&
      payload.address.trim().length <= 255;
    if (payload.addressId !== undefined && !hasSavedAddress) {
      throw new AppError(400, "El identificador de dirección no es válido.");
    }
    if (!hasSavedAddress && !hasNewAddress) {
      throw new AppError(400, "La dirección es obligatoria para pedidos a domicilio y debe tener entre 5 y 255 caracteres.");
    }
    if (payload.saveAddress === true && !customerSession) {
      throw new AppError(401, "Inicia sesión para guardar una dirección frecuente.");
    }
    if (payload.saveAddress === true && (
      hasSavedAddress ||
      typeof payload.addressLabel !== "string" ||
      payload.addressLabel.trim().length < 2 ||
      payload.addressLabel.trim().length > 40
    )) {
      throw new AppError(400, "Ingresa un nombre de 2 a 40 caracteres para guardar la dirección.");
    }
  } else if (payload.saveAddress === true || payload.addressId !== undefined) {
    throw new AppError(400, "Las direcciones solo se pueden seleccionar para pedidos a domicilio.");
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

export async function createOrder(payload, customerSession = null) {
  validatePayload(payload, customerSession);

  return createOrderTransaction(async (transaction) => {
    const customerRole = await transaction.rol.findUnique({ where: { nombre_rol: "Cliente" } });
    const orderType = await transaction.tipoPedido.findUnique({ where: { descripcion: orderModes.get(payload.mode) } });
    const pendingStatus = await transaction.estadoPedido.findUnique({ where: { descripcion: "Pendiente" } });
    if (!customerRole || !orderType || !pendingStatus) {
      throw new AppError(503, "Faltan datos iniciales del sistema. Ejecuta npm run db:seed.");
    }

    const account = customerSession
      ? await transaction.cuentaCliente.findUnique({
        where: { id_cuenta_cliente: customerSession.sub },
      })
      : null;
    if (customerSession && !account) {
      throw new AppError(401, "La cuenta de cliente ya no está disponible.");
    }

    const customerName = account
      ? `${account.nombres} ${account.apellidos}`
      : payload.customer.name.trim();
    const customerEmail = account ? account.correo : payload.customer.email.trim().toLowerCase();
    const customerPhone = account ? account.telefono : payload.customer.phone;
    const [firstName, ...lastNames] = customerName.trim().split(/\s+/);
    let customer;
    if (account) {
      customer = await transaction.usuario.findFirst({
        where: { correo: customerEmail, id_rol: customerRole.id_rol },
      });
      if (!customer) {
        const existingUser = await transaction.usuario.findUnique({
          where: { correo: customerEmail },
          select: { id_usuario: true },
        });
        const internalEmail = existingUser
          ? `cuenta-${account.id_cuenta_cliente}-${randomBytes(6).toString("hex")}@clientes.invalid`
          : customerEmail;
        customer = await transaction.usuario.create({
          data: {
            id_rol: customerRole.id_rol,
            nombres: firstName,
            apellidos: lastNames.join(" ") || "Cliente",
            correo: internalEmail,
            telefono: customerPhone,
            contrasena_hash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
          },
        });
      }
    } else {
      customer = await transaction.usuario.upsert({
        where: { correo: customerEmail },
        create: {
          id_rol: customerRole.id_rol,
          nombres: firstName,
          apellidos: lastNames.join(" ") || "Cliente",
          correo: customerEmail,
          telefono: customerPhone,
          contrasena_hash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
        },
        update: {},
      });
    }

    let deliveryAddress = null;
    if (payload.mode === "Delivery") {
      if (account && payload.addressId !== undefined) {
        const savedAddress = await transaction.direccionCliente.findFirst({
          where: {
            id_direccion_cliente: payload.addressId,
            id_cuenta_cliente: account.id_cuenta_cliente,
          },
        });
        if (!savedAddress) {
          throw new AppError(404, "No se encontró esa dirección en tu cuenta.");
        }
        deliveryAddress = savedAddress.direccion;
      } else {
        deliveryAddress = payload.address.trim();
      }
    }

    const productNames = [...new Set(payload.items.map((item) => item.name))];
    const products = await transaction.producto.findMany({
      where: { nombre: { in: productNames }, disponible: true },
    });
    const productsByName = new Map(products.map((product) => [product.nombre, product]));
    const details = [];
    for (const item of payload.items) {
      const product = productsByName.get(item.name);
      if (!product) throw new AppError(400, `El producto ${item.name} no está disponible.`);

      const unitPrice = Math.round(Number(product.precio_venta_actual) * 100) + item.extra;
      details.push({
        id_producto: product.id_producto,
        cantidad: item.quantity,
        precio_unitario_historico: (unitPrice / 100).toFixed(2),
        subtotal: unitPrice * item.quantity,
        extra: item.extra,
      });
    }

    const productIds = [...new Set(details.map((detail) => detail.id_producto))];
    const recipes = await transaction.receta.findMany({
      where: { id_producto: { in: productIds } },
      select: {
        id_producto: true,
        id_ingrediente: true,
        cantidad_necesaria: true,
        ingrediente: { select: { nombre: true } },
      },
    });
    const recipesByProduct = new Map();
    for (const recipe of recipes) {
      const productRecipes = recipesByProduct.get(recipe.id_producto) ?? [];
      productRecipes.push(recipe);
      recipesByProduct.set(recipe.id_producto, productRecipes);
    }
    const requirements = [];
    for (const detail of details) {
      const productRecipes = recipesByProduct.get(detail.id_producto);
      if (!productRecipes?.length) {
        throw new AppError(503, "Falta configurar la receta de un producto. Ejecuta npm run db:seed.");
      }
      for (const recipe of productRecipes) {
        requirements.push({
          id_ingrediente: recipe.id_ingrediente,
          name: recipe.ingrediente.nombre,
          quantityMilli: Math.round(Number(recipe.cantidad_necesaria) * 1000) * detail.cantidad,
        });
      }
      if (detail.extra > 0) {
        const cheeseRecipe = productRecipes.find((recipe) =>
          recipe.ingrediente.nombre.startsWith("Queso "),
        );
        if (!cheeseRecipe) {
          throw new AppError(503, "Falta configurar el queso extra en la receta del producto.");
        }
        requirements.push({
          id_ingrediente: cheeseRecipe.id_ingrediente,
          name: cheeseRecipe.ingrediente.nombre,
          quantityMilli: 30 * detail.cantidad,
        });
      }
    }
    await consumeIngredientStock(transaction, requirements);

    const total = details.reduce((sum, item) => sum + item.subtotal, 0);
    const order = await transaction.pedido.create({
      data: {
        id_usuario: customer.id_usuario,
        id_cuenta_cliente: account?.id_cuenta_cliente ?? null,
        id_tipo_pedido: orderType.id_tipo_pedido,
        id_estado_pedido: pendingStatus.id_estado_pedido,
        fecha_hora: new Date(),
        total: (total / 100).toFixed(2),
        direccion_entrega: deliveryAddress,
        detalles: {
          create: details.map(({ subtotal: _subtotal, extra: _extra, ...detail }) => detail),
        },
      },
      include: { detalles: true },
    });

    if (account && payload.saveAddress === true) {
      await transaction.direccionCliente.create({
        data: {
          id_cuenta_cliente: account.id_cuenta_cliente,
          etiqueta: payload.addressLabel.trim(),
          direccion: deliveryAddress,
        },
      });
    }

    return { id: order.id_pedido, status: "Pendiente", total, createdAt: order.fecha_hora };
  });
}