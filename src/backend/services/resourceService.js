import bcrypt from "bcryptjs";
import { AppError } from "../errors/AppError.js";
import { createResourceRepository } from "../repositories/resourceRepository.js";

export function createResourceService({ delegate, idField, fields, name }) {
  const repository = createResourceRepository(delegate, idField);
  const allowedFields = fields.filter((field) => field !== "contrasena_hash");

  async function sanitize(payload, { requirePassword = false } = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AppError(400, "El cuerpo de la solicitud no es válido.");
    }
    const values = Object.fromEntries(allowedFields
      .filter((field) => Object.hasOwn(payload, field))
      .map((field) => [field, payload[field]]));
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
    list: () => repository.list(),
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