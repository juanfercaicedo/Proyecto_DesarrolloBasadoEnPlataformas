import { prisma } from "../database/prisma.js";

export function findAvailableProducts() {
  const now = new Date();
  const currentDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  return prisma.producto.findMany({
    where: { disponible: true },
    include: {
      categoria: { select: { nombre_categoria: true } },
      recetas: {
        select: {
          cantidad_necesaria: true,
          ingrediente: {
            select: {
              lotes: {
                where: {
                  fecha_vencimiento: { gte: currentDay },
                  cantidad_disponible: { gt: 0 },
                },
                select: { cantidad_disponible: true },
              },
            },
          },
        },
      },
    },
    orderBy: { id_producto: "asc" },
  });
}