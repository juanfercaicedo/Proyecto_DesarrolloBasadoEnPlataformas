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
    if (!product) return [];

    return [{
      ...entry,
      id: product.id_producto,
      price: Math.round(Number(product.precio_venta_actual) * 100),
      category: product.categoria?.nombre_categoria,
    }];
  });
}