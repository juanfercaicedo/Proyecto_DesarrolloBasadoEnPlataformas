import bcrypt from "bcryptjs";
import { AppError } from "../errors/AppError.js";
import { createResourceRepository } from "../repositories/resourceRepository.js";

const nullableIdFields = new Set([
  "Usuario.id_supervisor",
  "Pago.id_usuario_admin",
  "OrdenSalida.id_usuario_despacha",
]);
const positiveDecimalFields = new Set(["cantidad_inicial", "cantidad_necesaria"]);
const nonNegativeDecimalFields = new Set([
  "precio_venta_actual",
  "stock_minimo",
  "cantidad_inicial",
  "cantidad_disponible",
  "cantidad_necesaria",
  "total",
  "precio_unitario_historico",
  "monto",
  "subtotal_facturado",
  "impuestos_facturados",
  "total_facturado",
]);

export function parsePagination(query = {}) {
  const parseValue = (value, fallback, name) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
      throw new AppError(400, `El parámetro ${name} debe ser un entero positivo.`);
    }
    return Number(value);
  };
  const page = parseValue(query.page, 1, "page");
  const limit = parseValue(query.limit, 50, "limit");
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || limit > 100 || !Number.isSafeInteger(skip)) {
    throw new AppError(400, "La página debe ser válida y el límite no puede superar 100.");
  }
  return { page, limit, skip, take: limit };
}

function validateValue(modelName, field, value) {
  if (field.startsWith("id_")) {
    if (value === null && nullableIdFields.has(`${modelName}.${field}`)) return;
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new AppError(400, `${field} debe ser un entero positivo.`);
    }
    return;
  }
  if (field === "cantidad") {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new AppError(400, "La cantidad debe ser un entero positivo.");
    }
    return;
  }
  if (nonNegativeDecimalFields.has(field)) {
    const numericValue = typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;
    if ((typeof value === "string" && value.trim() === "") || !Number.isFinite(numericValue) || numericValue < 0) {
      throw new AppError(400, `${field} debe ser un número mayor o igual a cero.`);
    }
    if (positiveDecimalFields.has(field) && numericValue === 0) {
      throw new AppError(400, `${field} debe ser mayor que cero.`);
    }
  }
}

export function createResourceService({ delegate, idField, fields, name }) {
  const repository = createResourceRepository(delegate, idField);
  const allowedFields = fields.filter((field) => field !== "contrasena_hash");

  async function sanitize(payload, { requirePassword = false } = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AppError(400, "El cuerpo de la solicitud no es válido.");
    }
    const values = Object.fromEntries(allowedFields
      .filter((field) => Object.hasOwn(payload, field))
      .map((field) => {
        validateValue(name, field, payload[field]);
        return [field, payload[field]];
      }));
    if (name === "Usuario") {
      if (typeof payload.password === "string" && payload.password.length >= 10) {
        values.contrasena_hash = await bcrypt.hash(payload.password, 12);
      } else if (requirePassword || payload.password !== undefined) {
        throw new AppError(400, "La contraseña debe tener al menos 10 caracteres.");
      }
    }
    if (Object.keys(values).length === 0) throw new AppError(400, "No hay campos permitidos para guardar.");
    return values;
  }

  return {
    list: async (query) => {
      const { page, limit, skip, take } = parsePagination(query);
      const [records, total] = await repository.list({ skip, take });
      return { records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },
    get: async (id) => {
      const record = await repository.findById(id);
      if (!record) throw new AppError(404, "No se encontró el registro.");
      return record;
    },
    create: async (payload) => repository.create(await sanitize(payload, { requirePassword: true })),
    update: async (id, payload) => {
      try {
        return await repository.update(id, await sanitize(payload));
      } catch (error) {
        if (error.code === "P2025") throw new AppError(404, "No se encontró el registro.");
        throw error;
      }
    },
    remove: async (id) => {
      try {
        await repository.remove(id);
      } catch (error) {
        if (error.code === "P2025") throw new AppError(404, "No se encontró el registro.");
        throw error;
      }
    },
  };
}