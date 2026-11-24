import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { findAvailableProducts } from "../repositories/productRepository.js";

const catalogPath = fileURLToPath(
  new URL("../../../frontend/src/assets/data/hamburguesas.json", import.meta.url),
);

export async function listProducts() {
  const [catalog, products] = await Promise.all([
    readFile(catalogPath, "utf8").then(JSON.parse),
    findAvailableProducts(),
  ]);
  const productsByName = new Map(products.map((product) => [product.nombre, product]));

  return catalog.flatMap((entry) => {
    const product = productsByName.get(entry.name);
    if (!product || !product.recetas.length) return [];
    const canPrepare = product.recetas.every((recipe) => {
      const availableMilli = recipe.ingrediente.lotes.reduce(
        (sum, lot) => sum + Math.round(Number(lot.cantidad_disponible) * 1000),
        0,
      );
      return availableMilli >= Math.round(Number(recipe.cantidad_necesaria) * 1000);
    });
    if (!canPrepare) return [];

    return [{
      ...entry,
      id: product.id_producto,
      price: Math.round(Number(product.precio_venta_actual) * 100),
      category: product.categoria?.nombre_categoria,
    }];
  });
}