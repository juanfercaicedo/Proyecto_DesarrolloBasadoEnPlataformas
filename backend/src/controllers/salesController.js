import { prisma } from "../database/prisma.js";
import { parsePagination } from "../services/resourceService.js";

export const salesController = {
  summary: async (request, response, next) => {
    try {
      const since = request.query.since ? new Date(request.query.since) : new Date(0);
      const until = request.query.until ? new Date(request.query.until) : new Date();
      if (Number.isNaN(since.valueOf()) || Number.isNaN(until.valueOf()) || since > until) {
        return response.status(400).json({ error: "El rango de fechas no es válido." });
      }

      const where = { fecha_hora: { gte: since, lte: until } };
      const [cantidad_pedidos, aggregate] = await Promise.all([
        prisma.pedido.count({ where }),
        prisma.pedido.aggregate({ where, _sum: { total: true } }),
      ]);
      response.json({ data: {
        cantidad_pedidos,
        total_ventas: Number(aggregate._sum.total ?? 0),
      } });
    } catch (error) {
      next(error);
    }
  },
  list: async (request, response, next) => {
    try {
      const { page, limit, skip, take } = parsePagination(request.query);
      let where;
      if (request.query.status !== undefined) {
        const status = request.query.status;
        if (typeof status !== "string" || !/^[1-9]\d*$/.test(status) || !Number.isSafeInteger(Number(status))) {
          return response.status(400).json({ error: "El estado debe ser un identificador entero positivo." });
        }
        where = { id_estado_pedido: Number(status) };
      }
      const [orders, total] = await Promise.all([
        prisma.pedido.findMany({
          where,
          skip,
          take,
          orderBy: { fecha_hora: "desc" },
          include: { detalles: { include: { producto: true } }, pago: true },
        }),
        prisma.pedido.count({ where }),
      ]);
      response.json({
        data: orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },
};