import "dotenv/config";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma.js";

const catalogPath = fileURLToPath(
  new URL("../../../frontend/src/assets/data/hamburguesas.json", import.meta.url),
);
const adminPassword = process.env.ADMIN_PASSWORD;
const demoIngredients = [
  { nombre: "Carne de Res", unidad_medida: "KG", stock_minimo: "10.000", cantidad_inicial: "20.000" },
  { nombre: "Pan de Hamburguesa", unidad_medida: "Unidad", stock_minimo: "50.000", cantidad_inicial: "100.000" },
  { nombre: "Tomate", unidad_medida: "KG", stock_minimo: "5.000", cantidad_inicial: "10.000" },
  { nombre: "Queso Cheddar", unidad_medida: "KG", stock_minimo: "1.000", cantidad_inicial: "5.000" },
  { nombre: "Cebolla Crispy", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "3.000" },
  { nombre: "Salsa BV", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "4.000" },
  { nombre: "Queso Pepper Jack", unidad_medida: "KG", stock_minimo: "1.000", cantidad_inicial: "4.000" },
  { nombre: "Jalapeños", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "3.000" },
  { nombre: "Mayonesa Ahumada", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "3.000" },
  { nombre: "Portobello", unidad_medida: "KG", stock_minimo: "2.000", cantidad_inicial: "8.000" },
  { nombre: "Queso Provolone", unidad_medida: "KG", stock_minimo: "1.000", cantidad_inicial: "4.000" },
  { nombre: "Rúcula", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "2.000" },
  { nombre: "Pesto", unidad_medida: "KG", stock_minimo: "0.500", cantidad_inicial: "3.000" },
];
const demoRecipes = {
  "La Brasa": [
    ["Carne de Res", "0.300"],
    ["Pan de Hamburguesa", "1.000"],
    ["Queso Cheddar", "0.040"],
    ["Cebolla Crispy", "0.020"],
    ["Salsa BV", "0.030"],
  ],
  "La Fuego": [
    ["Carne de Res", "0.150"],
    ["Pan de Hamburguesa", "1.000"],
    ["Queso Pepper Jack", "0.030"],
    ["Jalapeños", "0.025"],
    ["Mayonesa Ahumada", "0.020"],
  ],
  "La Verde": [
    ["Portobello", "0.150"],
    ["Pan de Hamburguesa", "1.000"],
    ["Queso Provolone", "0.030"],
    ["Rúcula", "0.015"],
    ["Pesto", "0.020"],
  ],
};

if (!adminPassword || adminPassword.trim().length === 0 || adminPassword.length < 12) {
  console.error("Configura ADMIN_PASSWORD con al menos 12 caracteres antes de ejecutar el seed.");
  await prisma.$disconnect();
  process.exit(1);
}

try {
  const adminRole = await prisma.rol.upsert({
    where: { nombre_rol: "Administrador" },
    create: { nombre_rol: "Administrador" },
    update: {},
  });

  for (const nombre_rol of ["Cajero", "Cocinero", "Cliente"]) {
    await prisma.rol.upsert({ where: { nombre_rol }, create: { nombre_rol }, update: {} });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@brasaviva.local";
  const admin = await prisma.usuario.upsert({
    where: { correo: adminEmail },
    create: {
      id_rol: adminRole.id_rol,
      nombres: process.env.ADMIN_NAME ?? "Administrador",
      apellidos: process.env.ADMIN_LASTNAME ?? "Brasa Viva",
      correo: adminEmail,
      telefono: "0000000000",
      contrasena_hash: await bcrypt.hash(adminPassword, 12),
    },
    update: {},
  });

  for (const [delegate, descriptions] of [
    [prisma.tipoPedido, ["Para Llevar", "A Domicilio", "En Local"]],
    [prisma.estadoPedido, ["Pendiente", "Preparando", "Listo", "Entregado"]],
    [prisma.metodoPago, ["Efectivo", "Tarjeta de Crédito", "Transferencia"]],
    [prisma.estadoOrden, ["En Espera", "Despachado"]],
  ]) {
    for (const descripcion of descriptions) {
      await delegate.upsert({ where: { descripcion }, create: { descripcion }, update: {} });
    }
  }

  for (const nombre_categoria of ["Hamburguesas", "Bebidas"]) {
    await prisma.categoriaProducto.upsert({
      where: { nombre_categoria },
      create: { nombre_categoria },
      update: {},
    });
  }

  const ingredientsByName = new Map();
  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  for (const ingredientSeed of demoIngredients) {
    const ingredient = await prisma.ingrediente.upsert({
      where: { nombre: ingredientSeed.nombre },
      create: {
        nombre: ingredientSeed.nombre,
        unidad_medida: ingredientSeed.unidad_medida,
        stock_minimo: ingredientSeed.stock_minimo,
      },
      update: {},
    });
    ingredientsByName.set(ingredient.nombre, ingredient);
    await prisma.loteIngrediente.upsert({
      where: { codigo_lote: `DEMO-${ingredient.id_ingrediente}` },
      create: {
        id_ingrediente: ingredient.id_ingrediente,
        id_usuario_admin: admin.id_usuario,
        codigo_lote: `DEMO-${ingredient.id_ingrediente}`,
        fecha_ingreso: new Date(),
        fecha_vencimiento: expiresAt,
        cantidad_inicial: ingredientSeed.cantidad_inicial,
        cantidad_disponible: ingredientSeed.cantidad_inicial,
      },
      update: {},
    });
  }

  const category = await prisma.categoriaProducto.findUnique({
    where: { nombre_categoria: "Hamburguesas" },
  });
  const products = JSON.parse(await readFile(catalogPath, "utf8"));
  const productsByName = new Map();
  for (const product of products) {
    const savedProduct = await prisma.producto.upsert({
      where: { nombre: product.name },
      create: {
        id_categoria: category.id_categoria,
        id_usuario_admin: admin.id_usuario,
        nombre: product.name,
        precio_venta_actual: (product.price / 100).toFixed(2),
        disponible: true,
      },
      update: {},
    });
    productsByName.set(product.name, savedProduct);
  }

  for (const [productName, recipe] of Object.entries(demoRecipes)) {
    const product = productsByName.get(productName);
    for (const [ingredientName, quantity] of recipe) {
      const ingredient = ingredientsByName.get(ingredientName);
      await prisma.receta.upsert({
        where: {
          id_producto_id_ingrediente: {
            id_producto: product.id_producto,
            id_ingrediente: ingredient.id_ingrediente,
          },
        },
        create: {
          id_producto: product.id_producto,
          id_ingrediente: ingredient.id_ingrediente,
          cantidad_necesaria: quantity,
        },
        update: {},
      });
    }
  }

  console.log(`Seed listo: roles, catálogos, inventario de demostración y ${products.length} productos.`);
} catch (error) {
  console.error("No fue posible poblar los datos iniciales.", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
