import { prisma } from "../database/prisma.js";

export function findAvailableProducts() {
  return prisma.producto.findMany({
    where: { disponible: true },
    include: { categoria: { select: { nombre_categoria: true } } },
    orderBy: { id_producto: "asc" },
  });
}