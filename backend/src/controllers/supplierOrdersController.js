import { AppError } from "../errors/AppError.js";
import { prisma } from "../database/prisma.js";
import { parsePagination } from "../services/resourceService.js";

function getAdminId(request) {
  const id = request.adminUser?.sub;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(401, "Inicia sesión con una cuenta de administrador.");
  }
  return id;
}

function parseId(value, label) {
  const id = typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError(400, `${label} debe ser un entero positivo.`);
  }
  return id;
}

function parseQuantity(value) {
  const raw = typeof value === "number" ? String(value) : value;
  if (
    typeof raw !== "string" ||
    !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/.test(raw) ||
    Number(raw) <= 0
  ) {
    throw new AppError(400, "La cantidad debe ser mayor que cero y tener máximo tres decimales.");
  }
  return Number(raw).toFixed(3);
}

function parseExpiryDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, "La fecha de vencimiento no es válida.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, "La fecha de vencimiento no es válida.");
  }
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date < today) {
    throw new AppError(400, "La fecha de vencimiento no puede estar en el pasado.");
  }
  return date;
}

export const supplierOrdersController = {
  list: async (request, response, next) => {
    try {
      const { page, limit, skip, take } = parsePagination(request.query);
      const [data, total] = await Promise.all([
        prisma.solicitudProveedor.findMany({
          skip,
          take,
          include: {
            proveedor: { select: { nombre: true, telefono: true } },
            ingrediente: { select: { nombre: true, unidad_medida: true } },
          },
          orderBy: { fecha_solicitud: "desc" },
        }),
        prisma.solicitudProveedor.count(),
      ]);
      response.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },
  create: async (request, response, next) => {
    try {
      const adminId = getAdminId(request);
      const quantity = parseQuantity(request.body?.cantidad);
      const supplierId = parseId(request.body?.id_proveedor, "id_proveedor");
      const supplier = await prisma.proveedor.findUnique({
        where: { id_proveedor: supplierId },
      });
      if (!supplier) throw new AppError(404, "No se encontró el proveedor.");

      const pendingRequest = await prisma.solicitudProveedor.findFirst({
        where: {
          id_proveedor: supplierId,
          id_ingrediente: supplier.id_ingrediente,
          estado: "Pendiente",
        },
      });
      if (pendingRequest) {
        throw new AppError(409, "Ya existe una solicitud pendiente para este proveedor e ingrediente.");
      }

      const data = await prisma.solicitudProveedor.create({
        data: {
          id_proveedor: supplierId,
          id_ingrediente: supplier.id_ingrediente,
          id_usuario_admin: adminId,
          cantidad: quantity,
        },
        include: {
          proveedor: { select: { nombre: true, telefono: true } },
          ingrediente: { select: { nombre: true, unidad_medida: true } },
        },
      });
      response.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  },
  receive: async (request, response, next) => {
    try {
      const adminId = getAdminId(request);
      const requestId = parseId(request.params.id, "id_solicitud");
      const lotCode = typeof request.body?.codigo_lote === "string"
        ? request.body.codigo_lote.trim()
        : "";
      if (!lotCode || lotCode.length > 80) {
        throw new AppError(400, "El código del lote debe tener entre 1 y 80 caracteres.");
      }
      const expirationDate = parseExpiryDate(request.body?.fecha_vencimiento);

      const received = await prisma.$transaction(async (transaction) => {
        const supplierRequest = await transaction.solicitudProveedor.findUnique({
          where: { id_solicitud: requestId },
        });
        if (!supplierRequest) throw new AppError(404, "No se encontró la solicitud.");
        if (supplierRequest.estado !== "Pendiente") {
          throw new AppError(409, "Esta solicitud ya fue recibida o no está pendiente.");
        }

        const lot = await transaction.loteIngrediente.create({
          data: {
            id_ingrediente: supplierRequest.id_ingrediente,
            id_usuario_admin: adminId,
            codigo_lote: lotCode,
            fecha_ingreso: new Date(),
            fecha_vencimiento: expirationDate,
            cantidad_inicial: supplierRequest.cantidad,
            cantidad_disponible: supplierRequest.cantidad,
          },
        });
        const updatedRequest = await transaction.solicitudProveedor.update({
          where: { id_solicitud: requestId },
          data: { estado: "Recibido", fecha_recepcion: new Date() },
          include: {
            proveedor: { select: { nombre: true, telefono: true } },
            ingrediente: { select: { nombre: true, unidad_medida: true } },
          },
        });
        return { solicitud: updatedRequest, lote };
      });
      response.json({ data: received });
    } catch (error) {
      next(error);
    }
  },
};
