import { prisma } from "../database/prisma.js";

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
      const status = request.query.status ? Number(request.query.status) : undefined;
      const orders = await prisma.pedido.findMany({
        where: status ? { id_estado_pedido: status } : undefined,
        include: { detalles: { include: { producto: true } }, pago: true },
        orderBy: { fecha_hora: "desc" },
      });
      response.json({ data: orders });
    } catch (error) {
      next(error);
    }
  },
};