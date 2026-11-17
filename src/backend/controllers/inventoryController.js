import { prisma } from "../database/prisma.js";

export const inventoryController = {
  lowStock: async (_request, response, next) => {
    try {
      const ingredients = await prisma.ingrediente.findMany({
        include: { lotes: { select: { cantidad_disponible: true } } },
      });
      const lowStock = ingredients.map(({ lotes, ...ingredient }) => {
        const stock_actual = lotes.reduce((sum, lot) => sum + Number(lot.cantidad_disponible), 0);
        return { ...ingredient, stock_actual };
      }).filter((ingredient) => ingredient.stock_actual <= Number(ingredient.stock_minimo));
      response.json({ data: lowStock });
    } catch (error) {
      next(error);
    }
  },
  lots: async (request, response, next) => {
    try {
      const expiryDate = request.query.expiringBefore
        ? new Date(request.query.expiringBefore)
        : undefined;
      if (expiryDate && Number.isNaN(expiryDate.valueOf())) {
        return response.status(400).json({ error: "La fecha de vencimiento no es válida." });
      }
      const lots = await prisma.loteIngrediente.findMany({
        where: expiryDate
          ? { fecha_vencimiento: { lte: expiryDate } }
          : undefined,
        include: { ingrediente: true },
        orderBy: { fecha_vencimiento: "asc" },
      });
      response.json({ data: lots });
    } catch (error) {
      next(error);
    }
  },
};