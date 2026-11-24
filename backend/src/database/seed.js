import "dotenv/config";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma.js";

const catalogPath = fileURLToPath(
  new URL("../../../frontend/src/assets/data/hamburguesas.json", import.meta.url),
);

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
      contrasena_hash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "cambia-esta-clave-antes-de-usar", 12),
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

  for (const ingredient of [
    { nombre: "Carne de Res", unidad_medida: "KG", stock_minimo: "10.000" },
    { nombre: "Pan de Hamburguesa", unidad_medida: "Unidad", stock_minimo: "50.000" },
    { nombre: "Tomate", unidad_medida: "KG", stock_minimo: "5.000" },
  ]) {
    await prisma.ingrediente.upsert({
      where: { nombre: ingredient.nombre },
      create: ingredient,
      update: {},
    });
  }

  const category = await prisma.categoriaProducto.findUnique({
    where: { nombre_categoria: "Hamburguesas" },
  });
  const products = JSON.parse(await readFile(catalogPath, "utf8"));
  for (const product of products) {
    await prisma.producto.upsert({
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
  }

  console.log(`Seed listo: roles, catálogos, ingredientes y ${products.length} productos.`);
} catch (error) {
  console.error("No fue posible poblar los datos iniciales.", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
