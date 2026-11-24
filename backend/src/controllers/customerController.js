import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { AppError } from "../errors/AppError.js";
import { createCustomerSession } from "../services/customerSessionService.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{7,15}$/;

function accountProfile(account) {
  return {
    id: account.id_cuenta_cliente,
    name: `${account.nombres} ${account.apellidos}`,
    email: account.correo,
    phone: account.telefono,
  };
}

function sessionResponse(account) {
  return {
    ...createCustomerSession(account),
    user: accountProfile(account),
  };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validateAddress(payload) {
  const label = typeof payload?.label === "string" ? payload.label.trim() : "";
  const address = typeof payload?.address === "string" ? payload.address.trim() : "";
  const reference = typeof payload?.reference === "string" ? payload.reference.trim() : "";

  if (label.length < 2 || label.length > 40) {
    throw new AppError(400, "El nombre de la dirección debe tener entre 2 y 40 caracteres.");
  }
  if (address.length < 5 || address.length > 255) {
    throw new AppError(400, "La dirección debe tener entre 5 y 255 caracteres.");
  }
  if (reference.length > 180) {
    throw new AppError(400, "La referencia no puede superar 180 caracteres.");
  }

  return { etiqueta: label, direccion: address, referencia: reference || null };
}

function serializeAddress(address) {
  return {
    id: address.id_direccion_cliente,
    label: address.etiqueta,
    address: address.direccion,
    reference: address.referencia,
    createdAt: address.fecha_creacion,
  };
}

function parseAddressId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, "El identificador de dirección no es válido.");
  }
  return id;
}

export const customerController = {
  register: async (request, response, next) => {
    try {
      const body = request.body ?? {};
      const names = typeof body.name === "string" ? body.name.trim() : "";
      const surnames = typeof body.surname === "string" ? body.surname.trim() : "";
      const email = normalizeEmail(body.email);
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (names.length < 2 || names.length > 100 || surnames.length < 2 || surnames.length > 100) {
        throw new AppError(400, "Ingresa nombres y apellidos de entre 2 y 100 caracteres.");
      }
      if (email.length > 254 || !emailPattern.test(email)) {
        throw new AppError(400, "Ingresa un correo electrónico válido.");
      }
      if (!phonePattern.test(phone)) {
        throw new AppError(400, "El teléfono debe contener entre 7 y 15 dígitos.");
      }
      if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
        throw new AppError(400, "La contraseña debe tener entre 12 y 72 bytes.");
      }

      const account = await prisma.cuentaCliente.create({
        data: {
          nombres: names,
          apellidos: surnames,
          correo: email,
          telefono: phone,
          contrasena_hash: await bcrypt.hash(password, 12),
        },
      });
      response.status(201).json({ message: "Cuenta creada.", ...sessionResponse(account) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "Ya existe una cuenta con ese correo electrónico." });
        return;
      }
      next(error);
    }
  },

  login: async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body?.email);
      const password = typeof request.body?.password === "string" ? request.body.password : "";
      if (!email || email.length > 254 || !password || password.length > 72) {
        response.status(401).json({ error: "Correo o contraseña no válidos." });
        return;
      }

      const account = await prisma.cuentaCliente.findUnique({ where: { correo: email } });
      if (!account || !(await bcrypt.compare(password, account.contrasena_hash))) {
        response.status(401).json({ error: "Correo o contraseña no válidos." });
        return;
      }

      response.json(sessionResponse(account));
    } catch (error) {
      next(error);
    }
  },

  currentSession: (request, response) => {
    const { sub, name, email, phone } = request.customerSession;
    response.json({ user: { id: sub, name, email, phone } });
  },

  listAddresses: async (request, response, next) => {
    try {
      const addresses = await prisma.direccionCliente.findMany({
        where: { id_cuenta_cliente: request.customerSession.sub },
        orderBy: [{ fecha_creacion: "desc" }, { id_direccion_cliente: "desc" }],
      });
      response.json({ data: addresses.map(serializeAddress) });
    } catch (error) {
      next(error);
    }
  },

  createAddress: async (request, response, next) => {
    try {
      const address = await prisma.direccionCliente.create({
        data: {
          id_cuenta_cliente: request.customerSession.sub,
          ...validateAddress(request.body),
        },
      });
      response.status(201).json({ address: serializeAddress(address) });
    } catch (error) {
      next(error);
    }
  },

  updateAddress: async (request, response, next) => {
    try {
      const id = parseAddressId(request.params.id);
      const existing = await prisma.direccionCliente.findFirst({
        where: { id_direccion_cliente: id, id_cuenta_cliente: request.customerSession.sub },
      });
      if (!existing) {
        throw new AppError(404, "No se encontró esa dirección en tu cuenta.");
      }
      const address = await prisma.direccionCliente.update({
        where: { id_direccion_cliente: id },
        data: validateAddress(request.body),
      });
      response.json({ address: serializeAddress(address) });
    } catch (error) {
      next(error);
    }
  },

  deleteAddress: async (request, response, next) => {
    try {
      const id = parseAddressId(request.params.id);
      const result = await prisma.direccionCliente.deleteMany({
        where: { id_direccion_cliente: id, id_cuenta_cliente: request.customerSession.sub },
      });
      if (result.count === 0) {
        throw new AppError(404, "No se encontró esa dirección en tu cuenta.");
      }
      response.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },

  listOrders: async (request, response, next) => {
    try {
      const orders = await prisma.pedido.findMany({
        where: { id_cuenta_cliente: request.customerSession.sub },
        orderBy: [{ fecha_hora: "desc" }, { id_pedido: "desc" }],
        take: 50,
        include: {
          tipo: { select: { descripcion: true } },
          estado: { select: { descripcion: true } },
          detalles: {
            include: { producto: { select: { nombre: true } } },
            orderBy: { id_detalle: "asc" },
          },
        },
      });
      response.json({
        data: orders.map((order) => ({
          id: order.id_pedido,
          createdAt: order.fecha_hora,
          total: Number(order.total),
          address: order.direccion_entrega,
          mode: order.tipo.descripcion,
          status: order.estado.descripcion,
          items: order.detalles.map((detail) => ({
            name: detail.producto.nombre,
            quantity: detail.cantidad,
            unitPrice: Number(detail.precio_unitario_historico),
          })),
        })),
      });
    } catch (error) {
      next(error);
    }
  },
};
