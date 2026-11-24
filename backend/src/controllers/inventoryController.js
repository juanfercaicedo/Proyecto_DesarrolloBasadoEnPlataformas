import { prisma } from "../database/prisma.js";
import { parsePagination } from "../services/resourceService.js";

export function calculateCurrentStock(lots, today = new Date()) {
  const currentDay = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ));
  return lots.reduce((sum, lot) => {
    if (lot.fecha_vencimiento < currentDay) return sum;
    return sum + Number(lot.cantidad_disponible);
  }, 0);
}

export const inventoryController = {
  lowStock: async (_request, response, next) => {
    try {
      const today = new Date();
      const currentDay = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ));
      const ingredients = await prisma.ingrediente.findMany({
        include: {
          lotes: {
            where: {
              fecha_vencimiento: { gte: currentDay },
              cantidad_disponible: { gt: 0 },
            },
            select: { cantidad_disponible: true, fecha_vencimiento: true },
          },
        },
      });
      const lowStock = ingredients.map(({ lotes, ...ingredient }) => {
        const stock_actual = calculateCurrentStock(lotes, currentDay);
        return { ...ingredient, stock_actual };
      }).filter((ingredient) => ingredient.stock_actual <= Number(ingredient.stock_minimo));
      response.json({ data: lowStock });
    } catch (error) {
      next(error);
    }
  },
  lots: async (request, response, next) => {
    try {
      const { page, limit, skip, take } = parsePagination(request.query);
      const expiryDate = request.query.expiringBefore
        ? new Date(request.query.expiringBefore)
        : undefined;
      if (expiryDate && Number.isNaN(expiryDate.valueOf())) {
        return response.status(400).json({ error: "La fecha de vencimiento no es válida." });
      }
      const where = expiryDate ? { fecha_vencimiento: { lte: expiryDate } } : undefined;
      const [lots, total] = await Promise.all([
        prisma.loteIngrediente.findMany({
          where,
          skip,
          take,
          include: { ingrediente: true },
          orderBy: { fecha_vencimiento: "asc" },
        }),
        prisma.loteIngrediente.count({ where }),
      ]);
      response.json({
        data: lots,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },
};